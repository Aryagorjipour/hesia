"use client";

import { useRef, useState } from "react";
import Link from "next/link";

import {
  ArrowLeft,
  Check,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import { P2pQrDisplay } from "@/components/p2p/p2p-qr-display";
import { P2pQrScanner } from "@/components/p2p/p2p-qr-scanner";
import {
  buildAnswerPacket,
  runReceiverTransfer,
  validateIncomingOffer,
  type ReceiverSessionState,
} from "@/lib/p2p/sync-session";
import type { OfferPacket } from "@/types/p2p-sync";
import type { TrustedSender } from "@/types/p2p-sync";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

type Step = "scan-offer" | "review" | "transferring" | "done" | "error";

export function P2pReceiveView() {
  const [step, setStep] = useState<Step>("scan-offer");
  const [offerPacket, setOfferPacket] = useState<OfferPacket | null>(null);
  const [trusted, setTrusted] = useState<TrustedSender | null>(null);
  const [keyMismatch, setKeyMismatch] = useState(false);
  const [password, setPassword] = useState("");
  const [trustDevice, setTrustDevice] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resultMessage, setResultMessage] = useState<string | null>(null);
  const receiverRef = useRef<ReceiverSessionState | null>(null);
  const [answerEncoded, setAnswerEncoded] = useState<string | null>(null);
  const offerEncodedRef = useRef("");
  const localPasswordRef = useRef("");

  async function handleOfferScan(encoded: string) {
    setError(null);
    try {
      const result = await validateIncomingOffer(encoded);
      offerEncodedRef.current = encoded;
      setOfferPacket(result.packet);
      setTrusted(result.trusted);
      setKeyMismatch(result.keyMismatch);
      setStep("review");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Invalid offer");
      setStep("error");
    }
  }

  async function handleAccept() {
    if (!offerPacket) return;
    setError(null);

    let localPassword = localPasswordRef.current;
    if (!localPassword) {
      const entered = window.prompt("Enter your sync password:");
      if (!entered) return;
      localPassword = entered;
      localPasswordRef.current = entered;
    }

    try {
      const receiverState = await buildAnswerPacket(
        offerEncodedRef.current,
        localPassword,
        {
          trustDevice: !trusted && trustDevice,
          senderPassword: trusted ? undefined : password,
        },
      );
      receiverRef.current = receiverState;
      setAnswerEncoded(receiverState.encoded);
      setStep("transferring");

      void runReceiverTransfer(receiverState, localPassword).then((result) => {
        if (result.error) {
          setError(result.error);
          setStep("error");
          return;
        }
        const stats = result.stats;
        setResultMessage(
          stats
            ? `Applied ${stats.updated} updates (${stats.skipped} skipped, ${stats.deleted} deleted)`
            : "Sync applied",
        );
        setStep("done");
        localPasswordRef.current = "";
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to accept sync");
      setStep("error");
    }
  }

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex items-center gap-3">
        <Button size="sm" variant="ghost" className="h-9 gap-2" asChild>
          <Link href="/settings/data">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
        </Button>
        <div>
          <h1 className="text-lg font-medium text-foreground">
            Receive from my phone
          </h1>
          <p className="text-xs text-muted-foreground">
            Scan your phone&apos;s code, accept the sync, then show the answer QR
            back.
          </p>
        </div>
      </div>

      {step === "scan-offer" ? (
        <div className="rounded-2xl border border-border bg-card/50 p-5">
          <P2pQrScanner
            label="Scan the offer QR on your phone screen"
            onScan={(value) => void handleOfferScan(value)}
          />
        </div>
      ) : null}

      {step === "review" && offerPacket ? (
        <div className="space-y-4 rounded-2xl border border-border bg-card/50 p-5">
          <div>
            <p className="text-sm font-medium text-foreground">
              {offerPacket.deviceLabel}
            </p>
            <p className="text-xs text-muted-foreground">
              Device ID {offerPacket.deviceId}
            </p>
            {offerPacket.preview ? (
              <p className="mt-2 text-xs text-muted-foreground">
                {offerPacket.preview.tasks} tasks · {offerPacket.preview.tags} tags
                · {offerPacket.preview.categories} categories
              </p>
            ) : null}
          </div>

          {keyMismatch ? (
            <p className="text-xs text-unplanned">
              This device was trusted before but its key changed. Enter your
              password to re-verify.
            </p>
          ) : null}

          {trusted ? (
            <p className="flex items-center gap-1.5 text-xs text-planned">
              <ShieldCheck className="h-3.5 w-3.5" />
              Trusted device — tap Accept to apply changes.
            </p>
          ) : (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="receive-password">Sync password</Label>
                <Input
                  id="receive-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Must match your phone"
                />
              </div>
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                <Switch
                  checked={trustDevice}
                  onCheckedChange={setTrustDevice}
                />
                Trust this device — skip password next time
              </label>
            </div>
          )}

          <div className="flex gap-2">
            <Button
              onClick={() => void handleAccept()}
              disabled={!trusted && password.length < 8}
            >
              Accept
            </Button>
            <Button variant="ghost" onClick={() => setStep("scan-offer")}>
              Reject
            </Button>
          </div>
        </div>
      ) : null}

      {step === "transferring" && answerEncoded ? (
        <div className="space-y-4">
          <div className="flex items-center justify-center gap-2 rounded-2xl border border-border bg-card/50 p-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Receiving encrypted data…
          </div>
          <div className="rounded-2xl border border-border bg-card/50 p-5">
            <p className="mb-4 text-center text-sm text-muted-foreground">
              Show this answer code to your phone
            </p>
            <P2pQrDisplay value={answerEncoded} size="lg" label="Answer QR" />
          </div>
        </div>
      ) : null}

      {step === "done" ? (
        <div className="rounded-2xl border border-planned/30 bg-planned/10 p-5 text-center">
          <Check className="mx-auto h-8 w-8 text-planned" />
          <p className="mt-3 text-sm font-medium text-foreground">Sync applied</p>
          {resultMessage ? (
            <p className="mt-1 text-xs text-muted-foreground">{resultMessage}</p>
          ) : null}
          <Button className="mt-4" variant="outline" asChild>
            <Link href="/settings/data">Back to Data & Privacy</Link>
          </Button>
        </div>
      ) : null}

      {step === "error" && error ? (
        <div className="rounded-2xl border border-unplanned/30 bg-unplanned/10 p-5">
          <p className="text-sm text-unplanned">{error}</p>
          <Button
            className="mt-4"
            variant="outline"
            onClick={() => {
              setStep("scan-offer");
              setError(null);
            }}
          >
            Try again
          </Button>
        </div>
      ) : null}
    </div>
  );
}