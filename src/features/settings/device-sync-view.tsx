"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import {
  ArrowLeft,
  Loader2,
  Monitor,
  Radio,
  RefreshCw,
  Send,
  Smartphone,
  Wifi,
} from "lucide-react";
import { Scanner } from "@yudiel/react-qr-scanner";
import { db } from "@/lib/db/schema";
import { createPasswordVerifier, verifyPassword } from "@/lib/crypto/sync-password";
import { ensureDeviceId } from "@/lib/sync/device-id";
import { DeviceSyncCoordinator } from "@/lib/sync/coordinator";
import {
  isMixedContentRisk,
  normalizeRelayUrl,
} from "@/lib/sync/relay-client";
import { RelayQr } from "@/components/sync/relay-qr";
import type { RelayPeer, TransferProgress } from "@/types/device-sync";
import { toast } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

function deviceSyncFingerprint(
  sync: { deviceLabel?: string; lastRelayUrl?: string; enabled?: boolean; hasPassword?: boolean } | undefined,
): string {
  return JSON.stringify(sync ?? {});
}

function DeviceSyncForm() {
  const settings = useLiveQuery(() => db.settings.get("default"))!;
  const sync = settings.deviceSync;
  const hasPassword = Boolean(sync?.passwordVerifier);

  const [deviceLabel, setDeviceLabel] = useState(sync?.deviceLabel ?? "");
  const [relayUrl, setRelayUrl] = useState(sync?.lastRelayUrl ?? "ws://127.0.0.1:8765");
  const [relayPin, setRelayPin] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [peers, setPeers] = useState<RelayPeer[]>([]);
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [progress, setProgress] = useState<TransferProgress | null>(null);
  const [incoming, setIncoming] = useState<{
    peer: RelayPeer;
    sessionId: string;
    preview: { tasks: number; tags: number; categories: number };
  } | null>(null);
  const [showScanner, setShowScanner] = useState(false);
  const [sendingTo, setSendingTo] = useState<string | null>(null);

  const coordinatorRef = useRef<DeviceSyncCoordinator | null>(null);
  const passwordRef = useRef("");

  const displayLabel =
    deviceLabel.trim() ||
    settings.profile?.workspaceName ||
    settings.profile?.username ||
    "Hesia device";

  async function updateDeviceSync(
    patch: Partial<NonNullable<typeof sync>>,
  ) {
    const current = (await db.settings.get("default"))!;
    await db.settings.put({
      ...current,
      deviceSync: {
        enabled: current.deviceSync?.enabled ?? false,
        passwordVerifier: current.deviceSync?.passwordVerifier,
        deviceLabel: current.deviceSync?.deviceLabel,
        deviceId: current.deviceSync?.deviceId,
        lastRelayUrl: current.deviceSync?.lastRelayUrl,
        trustedDeviceIds: current.deviceSync?.trustedDeviceIds,
        ...patch,
      },
    });
  }

  const initCoordinator = useCallback(async () => {
    const deviceId = await ensureDeviceId();
    if (coordinatorRef.current) return coordinatorRef.current;

    const coordinator = new DeviceSyncCoordinator({
      deviceId,
      label: displayLabel,
      onPeers: setPeers,
      onProgress: setProgress,
      onIncomingRequest: (peer, sessionId, preview) => {
        setIncoming({ peer, sessionId, preview });
        toast.info({
          title: `${peer.label} wants to sync`,
          description: `${preview.tasks} tasks · ${preview.tags} tags`,
        });
      },
      onError: (message) => {
        toast.error({ title: "Sync error", description: message });
        setProgress({ phase: "error", message });
      },
    });
    coordinatorRef.current = coordinator;
    return coordinator;
  }, [displayLabel]);

  useEffect(() => {
    return () => {
      coordinatorRef.current?.disconnect();
      coordinatorRef.current = null;
    };
  }, []);

  async function handleConnect() {
    setConnecting(true);
    try {
      const url = normalizeRelayUrl(relayUrl);
      if (isMixedContentRisk(url)) {
        toast.warning({
          title: "Mixed content blocked",
          description:
            "HTTPS app cannot use ws:// from GitHub Pages. Use the installed PWA, local dev server, or wss:// relay.",
        });
      }
      const coordinator = await initCoordinator();
      await coordinator.connect(url, relayPin.trim() || undefined);
      setConnected(true);
      await updateDeviceSync({ lastRelayUrl: url, enabled: true });
      toast.success({ title: "Connected to relay", description: "Nearby devices will appear below." });
    } catch (e) {
      toast.error({
        title: "Could not connect",
        description: e instanceof Error ? e.message : "Relay connection failed",
      });
      setConnected(false);
    } finally {
      setConnecting(false);
    }
  }

  function handleDisconnect() {
    coordinatorRef.current?.disconnect();
    setConnected(false);
    setPeers([]);
    setIncoming(null);
    setProgress(null);
  }

  async function ensurePassword(): Promise<string> {
    if (passwordRef.current) return passwordRef.current;
    const entered = window.prompt("Enter your sync password:");
    if (!entered) throw new Error("Password required");
    const verifier = settings.deviceSync?.passwordVerifier;
    if (!verifier) throw new Error("Set a sync password first");
    const ok = await verifyPassword(entered, verifier);
    if (!ok) throw new Error("Wrong sync password");
    passwordRef.current = entered;
    return entered;
  }

  async function handleSend(peer: RelayPeer) {
    try {
      const pwd = await ensurePassword();
      setSendingTo(peer.deviceId);
      setProgress({ phase: "connecting", message: "Requesting sync…" });
      const coordinator = coordinatorRef.current;
      if (!coordinator) throw new Error("Not connected");
      await coordinator.sendToDevice(peer.deviceId, pwd);
      toast.success({ title: "Sync sent", description: `Data sent to ${peer.label}` });
    } catch (e) {
      toast.error({
        title: "Send failed",
        description: e instanceof Error ? e.message : "Could not send",
      });
    } finally {
      setSendingTo(null);
      passwordRef.current = "";
    }
  }

  async function handleAcceptIncoming() {
    if (!incoming) return;
    try {
      const pwd = await ensurePassword();
      setProgress({ phase: "connecting", message: "Accepting sync…" });
      const coordinator = coordinatorRef.current;
      if (!coordinator) throw new Error("Not connected");
      const stats = await coordinator.acceptRequest(incoming.peer.deviceId, pwd);
      toast.success({
        title: "Sync applied",
        description: `${stats.updated} updated, ${stats.skipped} skipped`,
      });
      setIncoming(null);
    } catch (e) {
      toast.error({
        title: "Receive failed",
        description: e instanceof Error ? e.message : "Could not receive",
      });
    } finally {
      passwordRef.current = "";
    }
  }

  function handleRejectIncoming() {
    if (!incoming) return;
    coordinatorRef.current?.rejectRequest(incoming.peer.deviceId, "Rejected");
    setIncoming(null);
  }

  async function handleSavePassword() {
    if (password.length < 8) {
      toast.error({ title: "Password too short", description: "Min 8 characters" });
      return;
    }
    if (password !== passwordConfirm) {
      toast.error({ title: "Passwords do not match", description: "" });
      return;
    }
    const verifier = await createPasswordVerifier(password);
    await updateDeviceSync({
      passwordVerifier: verifier,
      deviceLabel: deviceLabel.trim() || undefined,
    });
    setPassword("");
    setPasswordConfirm("");
    toast.success({ title: "Sync password saved", description: "" });
  }

  const defaultRelayHint = "ws://127.0.0.1:8765";

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
          <h1 className="text-lg font-medium text-foreground">Device sync</h1>
          <p className="text-xs text-muted-foreground">
            ShareIt-style sync over your local network — tap a nearby device to send data.
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card/50 p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <Monitor className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
          <div className="space-y-2 text-xs text-muted-foreground">
            <p className="font-medium text-foreground">On your desktop (Arch)</p>
            <ol className="list-decimal space-y-1 pl-4">
              <li>Run <code className="rounded bg-muted px-1">npm run sync:relay</code> in the project folder</li>
              <li>Note the <code className="rounded bg-muted px-1">ws://192.168.x.x:8765</code> URL printed</li>
              <li>Connect below — phone scans the relay QR</li>
            </ol>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card/50 p-4 sm:p-5 space-y-4">
        <p className="flex items-center gap-2 text-sm font-medium">
          <Radio className="h-4 w-4 text-accent" />
          Setup
        </p>

        <div className="space-y-1.5">
          <Label>Device name</Label>
          <Input
            value={deviceLabel}
            onChange={(e) => setDeviceLabel(e.target.value)}
            placeholder="Arya's Phone"
            maxLength={32}
          />
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Sync password</Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={hasPassword ? "New password" : "Min 8 characters"}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Confirm</Label>
            <Input
              type="password"
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
            />
          </div>
        </div>
        <Button type="button" size="sm" disabled={!password} onClick={() => void handleSavePassword()}>
          {hasPassword ? "Update sync password" : "Set sync password"}
        </Button>
      </div>

      <div className="rounded-2xl border border-border bg-card/50 p-4 sm:p-5 space-y-4">
        <p className="flex items-center gap-2 text-sm font-medium">
          <Wifi className="h-4 w-4 text-accent" />
          Relay connection
        </p>

        <div className="space-y-1.5">
          <Label>Relay URL</Label>
          <Input
            value={relayUrl}
            onChange={(e) => setRelayUrl(e.target.value)}
            placeholder={defaultRelayHint}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Room PIN (optional)</Label>
          <Input
            value={relayPin}
            onChange={(e) => setRelayPin(e.target.value)}
            placeholder="If relay started with --pin"
            maxLength={8}
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {!connected ? (
            <Button
              type="button"
              disabled={connecting || !hasPassword}
              onClick={() => void handleConnect()}
            >
              {connecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Connect
            </Button>
          ) : (
            <Button type="button" variant="outline" onClick={handleDisconnect}>
              Disconnect
            </Button>
          )}
          <Button type="button" variant="outline" size="sm" onClick={() => setShowScanner((v) => !v)}>
            <Smartphone className="h-4 w-4" />
            {showScanner ? "Hide scanner" : "Scan relay QR"}
          </Button>
        </div>

        {showScanner ? (
          <div className="overflow-hidden rounded-2xl border border-border">
            <Scanner
              onScan={(codes) => {
                const value = codes[0]?.rawValue;
                if (value) {
                  setRelayUrl(value);
                  setShowScanner(false);
                  toast.success({ title: "Relay URL scanned", description: "" });
                }
              }}
              styles={{ container: { width: "100%", minHeight: 240 } }}
            />
          </div>
        ) : null}

        {connected && relayUrl ? (
          <RelayQr url={relayUrl} label="Show this QR on desktop for phone to scan" />
        ) : null}
      </div>

      {incoming ? (
        <div className="rounded-2xl border border-accent/40 bg-accent/10 p-4 space-y-3">
          <p className="text-sm font-medium">{incoming.peer.label} wants to send data</p>
          <p className="text-xs text-muted-foreground">
            {incoming.preview.tasks} tasks · {incoming.preview.tags} tags ·{" "}
            {incoming.preview.categories} categories
          </p>
          <div className="flex gap-2">
            <Button type="button" size="sm" onClick={() => void handleAcceptIncoming()}>
              Accept
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={handleRejectIncoming}>
              Reject
            </Button>
          </div>
        </div>
      ) : null}

      {progress ? (
        <div className="rounded-2xl border border-border bg-card/50 p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            {progress.message ?? progress.phase}
          </div>
          {progress.chunkTotal ? (
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-accent transition-all"
                style={{
                  width: `${Math.round(((progress.chunkIndex ?? 0) / progress.chunkTotal) * 100)}%`,
                }}
              />
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="rounded-2xl border border-border bg-card/50 p-4 sm:p-5">
        <p className="mb-4 text-sm font-medium">Nearby devices</p>
        {!connected ? (
          <p className="text-xs text-muted-foreground">Connect to the relay to see devices.</p>
        ) : peers.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            No other devices yet — connect your phone to the same relay URL.
          </p>
        ) : (
          <ul className="space-y-2">
            {peers.map((peer) => (
              <li
                key={peer.deviceId}
                className="flex items-center justify-between rounded-xl border border-border/60 bg-muted/20 px-4 py-3"
              >
                <div>
                  <p className="text-sm font-medium">{peer.label}</p>
                  <p className="text-[11px] text-muted-foreground">{peer.deviceId}</p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  disabled={!!sendingTo}
                  onClick={() => void handleSend(peer)}
                >
                  {sendingTo === peer.deviceId ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  Send data
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export function DeviceSyncView() {
  const settings = useLiveQuery(() => db.settings.get("default"));

  if (settings === undefined) {
    return (
      <div className="p-6">
        <div className="h-40 animate-pulse rounded-2xl bg-muted/30" />
      </div>
    );
  }

  return (
    <DeviceSyncForm
      key={deviceSyncFingerprint({
        deviceLabel: settings.deviceSync?.deviceLabel,
        lastRelayUrl: settings.deviceSync?.lastRelayUrl,
        enabled: settings.deviceSync?.enabled,
        hasPassword: Boolean(settings.deviceSync?.passwordVerifier),
      })}
    />
  );
}

export function DeviceSyncSettingsPanel() {
  const settings = useLiveQuery(() => db.settings.get("default"));
  const sync = settings?.deviceSync;
  const enabled = sync?.enabled ?? false;

  if (settings === undefined) {
    return <div className="h-24 animate-pulse rounded-2xl bg-muted/30" />;
  }

  return (
    <div className="rounded-2xl border border-border bg-card/50 p-4 sm:p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="flex items-center gap-2 text-sm font-medium">
            <Radio className="h-4 w-4 text-accent" />
            Device sync
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Sync with nearby devices via a local relay — like ShareIt, but for your Hesia data.
          </p>
        </div>
        <Switch
          checked={enabled}
          onCheckedChange={(v) => {
            void db.settings.get("default").then((current) => {
              if (!current) return;
              void db.settings.put({
                ...current,
                deviceSync: {
                  ...current.deviceSync,
                  enabled: v,
                  passwordVerifier: current.deviceSync?.passwordVerifier,
                },
              });
            });
          }}
        />
      </div>
      {enabled ? (
        <Button size="sm" className="mt-4 gap-2" asChild>
          <Link href="/settings/data/sync">
            <Smartphone className="h-4 w-4" />
            Open device sync
          </Link>
        </Button>
      ) : null}
    </div>
  );
}