"use client";

import Link from "next/link";
import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Smartphone, Monitor, Radio } from "lucide-react";
import { db } from "@/lib/db/schema";
import { createPasswordVerifier } from "@/lib/crypto/sync-password";
import { ensureDeviceIdentity } from "@/lib/crypto/device-identity";
import { toast } from "@/lib/toast";
import { P2pTrustedDevices } from "@/features/settings/p2p-trusted-devices";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export function P2pSyncSettings() {
  const settings = useLiveQuery(() => db.settings.get("default"));
  const p2p = settings?.p2pSync;
  const enabled = p2p?.enabled ?? false;
  const hasPassword = Boolean(p2p?.passwordVerifier);

  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [deviceLabel, setDeviceLabel] = useState(p2p?.deviceLabel ?? "");
  const [saving, setSaving] = useState(false);

  async function updateP2p(patch: Partial<NonNullable<typeof p2p>>) {
    const current = (await db.settings.get("default"))!;
    await db.settings.put({
      ...current,
      p2pSync: {
        enabled: current.p2pSync?.enabled ?? false,
        passwordVerifier: current.p2pSync?.passwordVerifier,
        deviceLabel: current.p2pSync?.deviceLabel,
        ...patch,
      },
    });
  }

  async function handleToggle(next: boolean) {
    if (next && !hasPassword) {
      toast.warning({
        title: "Sync password required",
        description: "Set a sync password before enabling P2P sync.",
      });
      return;
    }
    await updateP2p({ enabled: next });
    toast.info({
      title: next ? "P2P sync enabled" : "P2P sync disabled",
      description: next
        ? "You can now send or receive data from trusted devices."
        : "Nearby device sync is turned off.",
    });
  }

  async function handleSavePassword() {
    setSaving(true);
    try {
      if (password.length < 8) {
        throw new Error("Sync password must be at least 8 characters");
      }
      if (password !== passwordConfirm) {
        throw new Error("Passwords do not match");
      }
      const verifier = await createPasswordVerifier(password);
      await ensureDeviceIdentity(password);
      await updateP2p({
        passwordVerifier: verifier,
        deviceLabel: deviceLabel.trim() || undefined,
      });
      setPassword("");
      setPasswordConfirm("");
      toast.success({
        title: "Sync password saved",
        description: "Your device is ready for encrypted P2P sync.",
      });
    } catch (e) {
      toast.error({
        title: "Could not save password",
        description: e instanceof Error ? e.message : "Failed to save password",
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveLabel() {
    await updateP2p({ deviceLabel: deviceLabel.trim() || undefined });
    toast.success({
      title: "Device label saved",
      description: deviceLabel.trim()
        ? `This device will appear as "${deviceLabel.trim()}".`
        : "Device label cleared.",
    });
  }

  return (
    <div className="rounded-2xl border border-border bg-card/50 p-4 sm:p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="flex items-center gap-2 text-sm font-medium text-foreground">
            <Radio className="h-4 w-4 text-accent" />
            Nearby P2P sync
          </p>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Sync from your phone to this computer over Wi‑Fi. No cloud. Devices
            are identified by a cryptographic key — not an IP address. You will
            scan QR codes to connect.
          </p>
        </div>
        <Switch checked={enabled} onCheckedChange={(v) => void handleToggle(v)} />
      </div>

      <div className="mt-4 space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="p2p-device-label">This device&apos;s name</Label>
          <div className="flex gap-2">
            <Input
              id="p2p-device-label"
              value={deviceLabel}
              onChange={(e) => setDeviceLabel(e.target.value)}
              placeholder="Arya's Phone or Home Desktop"
              maxLength={32}
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="shrink-0"
              onClick={() => void handleSaveLabel()}
            >
              Save
            </Button>
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="p2p-password">Sync password</Label>
            <Input
              id="p2p-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={hasPassword ? "Enter new password" : "Min 8 characters"}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="p2p-password-confirm">Confirm password</Label>
            <Input
              id="p2p-password-confirm"
              type="password"
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
            />
          </div>
        </div>
        <Button
          type="button"
          size="sm"
          disabled={saving || !password}
          onClick={() => void handleSavePassword()}
        >
          {hasPassword ? "Update sync password" : "Set sync password"}
        </Button>
      </div>

      {enabled ? (
        <div className="mt-4 flex flex-wrap gap-2">
          <Button size="sm" className="gap-2" asChild>
            <Link href="/settings/data/sync/send">
              <Smartphone className="h-4 w-4" />
              Send to my desktop
            </Link>
          </Button>
          <Button size="sm" variant="outline" className="gap-2" asChild>
            <Link href="/settings/data/sync/receive">
              <Monitor className="h-4 w-4" />
              Receive from my phone
            </Link>
          </Button>
        </div>
      ) : null}

      <div className="mt-5 border-t border-border/60 pt-4">
        <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Trusted devices
        </p>
        <P2pTrustedDevices />
      </div>
    </div>
  );
}