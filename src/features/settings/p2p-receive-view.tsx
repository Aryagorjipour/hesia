"use client";

import { useEffect, useRef, useState } from "react";
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
  applyIcePatch,
  buildAnswerPacket,
  buildReceiverIcePatch,
  prepareReceiverConnection,
  runReceiverTransfer,
  validateIncomingOffer,
  type ReceiverSessionState,
} from "@/lib/p2p/sync-session";
import type { OfferPacket } from "@/types/p2p-sync";
import type { TrustedSender } from "@/types/p2p-sync";
import { toast } from "@/lib/toast";
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
  const [resultMessage, setResultMessage] = useState<string | null>(null);
  const receiverRef = useRef<ReceiverSessionState | null>(null);
  const transferRunningRef = useRef(false);
  const [answerEncoded, setAnswerEncoded] = useState<string | null>(null);
  const [icePatchEncoded, setIcePatchEncoded] = useState<string | null>(null);
  const offerEncodedRef = useRef("");
  const localPasswordRef = useRef("");

  useEffect(() => {
    if (step !== "transferring") return;
    const receiverState = receiverRef.current;
    if (!receiverState) return;

    const timer = window.setTimeout(() => {
      void buildReceiverIcePatch(receiverState).then((patch) => {
        if (patch) setIcePatchEncoded(patch);
      });
    }, 4000);

    return () => window.clearTimeout(timer);
  }, [step, answerEncoded]);

  async function handleOfferScan(encoded: string) {
    try {
      const result = await validateIncomingOffer(encoded);
      offerEncodedRef.current = encoded;
      setOfferPacket(result.packet);
      setTrusted(result.trusted);
      setKeyMismatch(result.keyMismatch);
      setStep("review");
    } catch (e) {
      toast.error({
        title: "Could not read offer",
        description: e instanceof Error ? e.message : "Invalid offer",
      });
    }
  }

  async function startReceiverTransfer(receiverState: ReceiverSessionState) {
    if (transferRunningRef.current) return;
    transferRunningRef.current = true;

    try {
      const connection = await prepareReceiverConnection(receiverState);
      if (connection.error) {
        toast.error({
          title: "Connection failed",
          description: connection.error,
        });
        setStep("error");
        return;
      }

      const result = await runReceiverTransfer(
        receiverState,
        localPasswordRef.current,
      );

      if (result.error) {
        toast.error({
          title: "Sync failed",
          description: result.error,
        });
        setStep("error");
        return;
      }

      const stats = result.stats;
      const message =
        stats
          ? `Applied ${stats.updated} updates (${stats.skipped} skipped, ${stats.deleted} deleted)`
          : "Sync applied";
      setResultMessage(message);
      toast.success({
        title: "Sync applied",
        description: message,
      });
      setStep("done");
      localPasswordRef.current = "";
    } finally {
      transferRunningRef.current = false;
    }
  }

  async function handleAccept() {
    if (!offerPacket) return;

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
      setIcePatchEncoded(null);
      setStep("transferring");

      void startReceiverTransfer(receiverState);
    } catch (e) {
      toast.error({
        title: "Could not accept sync",
        description: e instanceof Error ? e.message : "Failed to accept sync",
      });
      setStep("error");
    }
  }

  async function handleIcePatchScan(encoded: string) {
    const receiverState = receiverRef.current;
    if (!receiverState) return;

    try {
      await applyIcePatch(
        receiverState.peer,
        encoded,
        receiverState.offerPacket.sessionId,
      );
      const patch = await buildReceiverIcePatch(receiverState);
      if (patch) setIcePatchEncoded(patch);
      toast.success({
        title: "Network handshake updated",
        description: "Keep both devices on the same Wi‑Fi while sync completes.",
      });
    } catch (e) {
      toast.error({
        title: "ICE patch failed",
        description: e instanceof Error ? e.message : "Invalid ICE patch",
      });
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
            Scan or paste your phone&apos;s code, accept the sync, then show the
            answer code back.
          </p>
        </div>
      </div>

      {step === "scan-offer" ? (
        <div className="rounded-2xl border border-border bg-card/50 p-5">
          <P2pQrScanner
            label="Scan or paste the offer code on your phone screen"
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
              type="button"
              onClick={() => void handleAccept()}
              disabled={!trusted && password.length < 8}
            >
              Accept
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setStep("scan-offer")}
            >
              Reject
            </Button>
          </div>
        </div>
      ) : null}

      {step === "transferring" && answerEncoded ? (
        <div className="space-y-4">
          <div className="flex items-center justify-center gap-2 rounded-2xl border border-border bg-card/50 p-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Waiting for your phone — scan the answer code first
          </div>
          <div className="rounded-2xl border border-border bg-card/50 p-5">
            <p className="mb-4 text-center text-sm text-muted-foreground">
              Show this answer code to your phone (scan or copy)
            </p>
            <P2pQrDisplay value={answerEncoded} size="lg" label="Answer code" />
          </div>
          <div className="space-y-4 rounded-2xl border border-border bg-card/50 p-5">
            <p className="text-sm text-muted-foreground">
              If sync stalls after scanning, exchange these network handshake
              codes (same Wi‑Fi, TURN off on both devices).
            </p>
            {icePatchEncoded ? (
              <P2pQrDisplay value={icePatchEncoded} size="md" label="ICE patch" />
            ) : (
              <p className="text-xs text-muted-foreground">
                Preparing network handshake code…
              </p>
            )}
            <P2pQrScanner
              label="Scan or paste the ICE patch from your phone"
              minLength={40}
              onScan={(value) => void handleIcePatchScan(value)}
            />
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

      {step === "error" ? (
        <div className="rounded-2xl border border-unplanned/30 bg-unplanned/10 p-5 text-center">
          <p className="text-sm text-muted-foreground">
            Sync could not be completed. Check the notification for details.
          </p>
          <Button
            type="button"
            className="mt-4"
            variant="outline"
            onClick={() => setStep("scan-offer")}
          >
            Try again
          </Button>
        </div>
      ) : null}
    </div>
  );
}