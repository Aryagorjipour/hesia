"use client";

import { useEffect, useState } from "react";
import {
  CheckCircle2,
  CircleAlert,
  ExternalLink,
  Loader2,
  Mail,
  Shield,
} from "lucide-react";
import { toast } from "@/lib/toast";
import {
  fetchRelaySmtpConfig,
  saveRelaySmtpConfig,
  testRelaySmtpConnection,
} from "@/lib/email/smtp-relay-api";
import {
  buildFromAddress,
  getSmtpPreset,
  guessPresetFromHost,
  parseFromAddress,
  SMTP_PRESETS,
} from "@/lib/email/smtp-presets";
import type { PublicSmtpConfig, SmtpFormValues } from "@/types/smtp";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const EMPTY_FORM: SmtpFormValues = {
  preset: "gmail",
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  user: "",
  pass: "",
  fromName: "Hesia",
};

function formFromPublicConfig(config: PublicSmtpConfig): SmtpFormValues {
  const { name, email } = parseFromAddress(config.from);
  return {
    preset: guessPresetFromHost(config.host),
    host: config.host,
    port: config.port,
    secure: config.secure,
    user: config.user || email,
    pass: "",
    fromName: name || "Hesia",
  };
}

interface RelaySmtpPanelProps {
  relayUrl: string;
  relayReachable: boolean;
  onSaved?: () => void;
  refreshKey?: number;
}

export function RelaySmtpPanel({
  relayUrl,
  relayReachable,
  onSaved,
  refreshKey = 0,
}: RelaySmtpPanelProps) {
  const [loading, setLoading] = useState(relayReachable);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [configured, setConfigured] = useState(false);
  const [passConfigured, setPassConfigured] = useState(false);
  const [form, setForm] = useState<SmtpFormValues>(EMPTY_FORM);

  const preset = getSmtpPreset(form.preset);

  useEffect(() => {
    let cancelled = false;
    if (!relayReachable) {
      Promise.resolve().then(() => {
        if (!cancelled) setLoading(false);
      });
      return () => {
        cancelled = true;
      };
    }

    fetchRelaySmtpConfig(relayUrl)
      .then((result) => {
        if (cancelled) return;
        setConfigured(result.configured);
        if (result.config) {
          setPassConfigured(result.config.passConfigured);
          setForm(formFromPublicConfig(result.config));
        }
      })
      .catch(() => {
        if (!cancelled) setConfigured(false);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [relayReachable, relayUrl, refreshKey]);

  function applyPreset(presetId: SmtpFormValues["preset"]) {
    const next = getSmtpPreset(presetId);
    setForm((prev) => ({
      ...prev,
      preset: presetId,
      host: next.host || prev.host,
      port: next.port,
      secure: next.secure,
    }));
  }

  function updateField<K extends keyof SmtpFormValues>(
    key: K,
    value: SmtpFormValues[K],
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    if (!form.user.trim()) {
      toast.warning({
        title: "Enter your email address",
        description: "We need your address to send mail.",
      });
      return;
    }
    if (!form.host.trim()) {
      toast.warning({
        title: "Enter an SMTP server",
        description: "Custom providers need a server hostname.",
      });
      return;
    }
    if (!passConfigured && !form.pass.trim()) {
      toast.warning({
        title: "Enter your app password",
        description: "Use an app password from your email provider.",
      });
      return;
    }

    setSaving(true);
    try {
      const result = await saveRelaySmtpConfig(relayUrl, form);
      setConfigured(result.configured);
      setPassConfigured(result.config?.passConfigured ?? false);
      setForm((prev) => ({ ...prev, pass: "" }));
      toast.success({
        title: "Email settings saved",
        description: "Stored on this computer by Hesia Companion.",
      });
      onSaved?.();
    } catch (err) {
      toast.error({
        title: "Could not save email settings",
        description: err instanceof Error ? err.message : "Save failed",
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleTest() {
    setTesting(true);
    try {
      const result = await testRelaySmtpConnection(relayUrl);
      if (result.ok) {
        toast.success({
          title: "Email connection works",
          description: result.message ?? "SMTP verified successfully.",
        });
      } else {
        toast.error({
          title: "Email connection failed",
          description: result.error ?? "Check your settings and try again.",
        });
      }
    } finally {
      setTesting(false);
    }
  }

  if (!relayReachable) {
    return (
      <div className="rounded-xl border border-dashed border-border/70 bg-muted/10 p-4 text-sm text-muted-foreground">
        Start Hesia Companion on this computer, then click{" "}
        <span className="text-foreground">Test connection</span> above to set up
        email.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading email settings…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div
        className={`flex items-start gap-2 rounded-xl border p-3 text-sm ${
          configured
            ? "border-planned/30 bg-planned/5 text-foreground"
            : "border-border/60 bg-muted/10 text-muted-foreground"
        }`}
      >
        {configured ? (
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-planned" />
        ) : (
          <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
        )}
        <div>
          <p className="font-medium text-foreground">
            {configured ? "Email ready" : "Set up your email"}
          </p>
          <p className="mt-0.5 text-xs leading-relaxed">
            {configured
              ? `Sending as ${buildFromAddress(form.fromName, form.user)}`
              : "Choose your provider and enter an app password below."}
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label>Email provider</Label>
          <Select
            value={form.preset}
            onValueChange={(v) => applyPreset(v as SmtpFormValues["preset"])}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SMTP_PRESETS.map((item) => (
                <SelectItem key={item.id} value={item.id}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            {preset.helpText}
            {preset.helpUrl && (
              <>
                {" "}
                <a
                  href={preset.helpUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-0.5 text-accent hover:underline"
                >
                  How to get an app password
                  <ExternalLink className="h-3 w-3" />
                </a>
              </>
            )}
          </p>
        </div>

        {form.preset === "custom" && (
          <>
            <div className="space-y-2">
              <Label htmlFor="smtp-host">SMTP server</Label>
              <Input
                id="smtp-host"
                value={form.host}
                onChange={(e) => updateField("host", e.target.value)}
                placeholder="smtp.example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="smtp-port">Port</Label>
              <Input
                id="smtp-port"
                type="number"
                min={1}
                max={65535}
                value={form.port}
                onChange={(e) =>
                  updateField("port", parseInt(e.target.value, 10) || 587)
                }
              />
            </div>
          </>
        )}

        <div className="space-y-2">
          <Label htmlFor="smtp-user">Your email</Label>
          <Input
            id="smtp-user"
            type="email"
            autoComplete="email"
            value={form.user}
            onChange={(e) => updateField("user", e.target.value)}
            placeholder="you@example.com"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="smtp-from-name">From name</Label>
          <Input
            id="smtp-from-name"
            value={form.fromName}
            onChange={(e) => updateField("fromName", e.target.value)}
            placeholder="Hesia"
          />
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="smtp-pass">App password</Label>
          <Input
            id="smtp-pass"
            type="password"
            autoComplete="new-password"
            value={form.pass}
            onChange={(e) => updateField("pass", e.target.value)}
            placeholder={
              passConfigured
                ? "Leave blank to keep your saved password"
                : "Paste app password here"
            }
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          onClick={() => void handleSave()}
          disabled={saving}
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Mail className="h-4 w-4" />
          )}
          Save email settings
        </Button>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={() => void handleTest()}
          disabled={testing || !configured}
        >
          {testing && <Loader2 className="h-4 w-4 animate-spin" />}
          Test email connection
        </Button>
      </div>

      <p className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
        <Shield className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        Your password is sent only to Hesia Companion on this computer
        (localhost) and saved in its private settings file — never to Hesía
        servers or the public web app.
      </p>
    </div>
  );
}