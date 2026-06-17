"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { ArrowLeft, Check, Loader2 } from "lucide-react";
import { db } from "@/lib/db/schema";
import { P2pQrDisplay } from "@/components/p2p/p2p-qr-display";
import { P2pQrScanner } from "@/components/p2p/p2p-qr-scanner";
import {
  applyIcePatch,
  buildOfferPacket,
  prepareSenderConnection,
  runSenderTransfer,
  type SenderSessionState,
} from "@/lib/p2p/sync-session";
import { verifyPassword } from "@/lib/crypto/sync-password";
import { toast } from "@/lib/toast";
import { Button } from "@/components/ui/button";

type Step =
  | "start"
  | "offer"
  | "scan-answer"
  | "ice-patch"
  | "transferring"
  | "done"
  | "error";

export function P2pSendView() {
  const settings = useLiveQuery(() => db.settings.get("default"));
  const [step, setStep] = useState<Step>("start");
  const [resultMessage, setResultMessage] = useState<string | null>(null);
  const sessionRef = useRef<SenderSessionState | null>(null);
  const answerEncodedRef = useRef<string | null>(null);
  const [offerEncoded, setOfferEncoded] = useState<string | null>(null);
  const [offerDeviceId, setOfferDeviceId] = useState<string | null>(null);
  const [icePatchEncoded, setIcePatchEncoded] = useState<string | null>(null);
  const passwordRef = useRef("");

  const deviceLabel =
    settings?.p2pSync?.deviceLabel ||
    settings?.profile?.workspaceName ||
    settings?.profile?.username ||
    "Hesia device";

  async function startSession() {
    const p2p = settings?.p2pSync;
    if (!p2p?.enabled || !p2p.passwordVerifier) {
      toast.error({
        title: "P2P sync not ready",
        description: "Enable P2P sync and set a password in Data & Privacy first.",
      });
      setStep("error");
      return;
    }

    if (!passwordRef.current) {
      const entered = window.prompt("Enter your sync password to start sending:");
      if (!entered) return;
      passwordRef.current = entered;
    }

    const passwordOk = await verifyPassword(
      passwordRef.current,
      p2p.passwordVerifier!,
    );
    if (!passwordOk) {
      passwordRef.current = "";
      toast.error({
        title: "Wrong sync password",
        description:
          "The password you entered does not match. Use the same password you set in Settings → Data & Privacy.",
      });
      return;
    }

    try {
      const session = await buildOfferPacket(passwordRef.current, deviceLabel);
      sessionRef.current = session;
      setOfferEncoded(session.encoded);
      setOfferDeviceId(session.packet.deviceId);
      setStep("offer");
    } catch (e) {
      toast.error({
        title: "Could not start sync",
        description: e instanceof Error ? e.message : "Failed to start session",
      });
      setStep("error");
    }
  }

  async function connectWithIceRetry(answerEncoded: string): Promise<boolean> {
    const session = sessionRef.current;
    if (!session) return false;

    const connection = await prepareSenderConnection(
      session.peer,
      session.packet,
      answerEncoded,
    );

    if (connection.needsIcePatch) {
      setIcePatchEncoded(connection.icePatchEncoded ?? null);
      setStep("ice-patch");
      toast.warning({
        title: "Need network handshake",
        description:
          connection.error ??
          "Share the ICE patch code with your desktop, then scan theirs.",
      });
      return false;
    }

    if (connection.error) {
      toast.error({
        title: "Connection failed",
        description: connection.error,
      });
      setStep("error");
      return false;
    }

    return true;
  }

  async function handleAnswerScan(answerEncoded: string) {
    const session = sessionRef.current;
    if (!session) return;

    answerEncodedRef.current = answerEncoded;
    setStep("transferring");

    const ready = await connectWithIceRetry(answerEncoded);
    if (!ready) return;

    const result = await runSenderTransfer(
      session.peer,
      session.packet,
      answerEncoded,
      passwordRef.current,
      session.senderEphemeralPrivateKey,
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
        ? `Synced ${stats.updated} updates (${stats.skipped} skipped, ${stats.deleted} deleted)`
        : "Sync complete";
    setResultMessage(message);
    toast.success({
      title: "Sync complete",
      description: message,
    });
    setStep("done");
    passwordRef.current = "";
  }

  async function handleIcePatchScan(encoded: string) {
    const session = sessionRef.current;
    const answerEncoded = answerEncodedRef.current;
    if (!session || !answerEncoded) return;

    try {
      await applyIcePatch(session.peer, encoded, session.packet.sessionId);
      const ready = await connectWithIceRetry(answerEncoded);
      if (!ready) return;

      setStep("transferring");
      const result = await runSenderTransfer(
        session.peer,
        session.packet,
        answerEncoded,
        passwordRef.current,
        session.senderEphemeralPrivateKey,
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
          ? `Synced ${stats.updated} updates (${stats.skipped} skipped, ${stats.deleted} deleted)`
          : "Sync complete";
      setResultMessage(message);
      toast.success({ title: "Sync complete", description: message });
      setStep("done");
      passwordRef.current = "";
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
          <h1 className="text-lg font-medium text-foreground">Send to my desktop</h1>
          <p className="text-xs text-muted-foreground">
            Show this code to your desktop, then scan the answer on your monitor.
          </p>
        </div>
      </div>

      {step === "start" ? (
        <div className="rounded-2xl border border-border bg-card/50 p-5 text-center">
          <p className="text-sm text-muted-foreground">
            Your phone will share tasks, tags, and settings with a trusted desktop.
            Works on the same Wi‑Fi or across networks when TURN relay is enabled.
          </p>
          <Button type="button" className="mt-4" onClick={() => void startSession()}>
            Start sync
          </Button>
        </div>
      ) : null}

      {step === "offer" && offerEncoded ? (
        <div className="space-y-4 rounded-2xl border border-border bg-card/50 p-5">
          <P2pQrDisplay
            value={offerEncoded}
            size="md"
            label={offerDeviceId ? `Device ID ${offerDeviceId}` : undefined}
          />
          <p className="text-center text-sm text-muted-foreground">
            On your desktop, open Receive from my phone and scan or paste this code.
          </p>
          <Button
            type="button"
            className="w-full"
            onClick={() => setStep("scan-answer")}
          >
            Desktop accepted — scan answer code
          </Button>
        </div>
      ) : null}

      {step === "scan-answer" ? (
        <div className="rounded-2xl border border-border bg-card/50 p-5">
          <P2pQrScanner
            label="Scan or paste the answer code from your desktop screen"
            onScan={(value) => void handleAnswerScan(value)}
          />
        </div>
      ) : null}

      {step === "ice-patch" ? (
        <div className="space-y-4 rounded-2xl border border-border bg-card/50 p-5">
          <p className="text-sm text-muted-foreground">
            Direct connection needs one more exchange. Show this ICE patch code to
            your desktop, then scan theirs below.
          </p>
          {icePatchEncoded ? (
            <P2pQrDisplay value={icePatchEncoded} size="md" label="ICE patch" />
          ) : null}
          <P2pQrScanner
            label="Scan or paste the ICE patch from the other device"
            minLength={40}
            onScan={(value) => void handleIcePatchScan(value)}
          />
        </div>
      ) : null}

      {step === "transferring" ? (
        <div className="flex items-center justify-center gap-2 rounded-2xl border border-border bg-card/50 p-8 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Transferring encrypted data…
        </div>
      ) : null}

      {step === "done" ? (
        <div className="rounded-2xl border border-planned/30 bg-planned/10 p-5 text-center">
          <Check className="mx-auto h-8 w-8 text-planned" />
          <p className="mt-3 text-sm font-medium text-foreground">Sync complete</p>
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
            onClick={() => setStep("start")}
          >
            Try again
          </Button>
        </div>
      ) : null}
    </div>
  );
}