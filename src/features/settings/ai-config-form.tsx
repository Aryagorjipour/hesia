"use client";

import { useEffect, useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import {
  CheckCircle2,
  XCircle,
  Loader2,
  BookOpen,
  Plus,
  Trash2,
} from "lucide-react";
import { db } from "@/lib/db/schema";
import { PROVIDER_PRESETS } from "@/lib/ai/providers";
import { buildContext } from "@/lib/ai/context-builder";
import {
  streamFeatureCompletion,
  testFeatureConnection,
} from "@/lib/ai/ai-service";
import { probeToolCallSupport } from "@/lib/ai/capability-probe";
import {
  defaultRoutingForProfile,
  migrateSettingsAi,
  profileFromLegacyConfig,
} from "@/lib/ai/migrate-ai-config";
import { encryptApiKey } from "@/lib/crypto/key-vault";
import {
  AI_FEATURE_KEYS,
  type AiFeatureKey,
  type AiFeatureRouting,
  type AiProviderProfile,
} from "@/types/ai-provider";
import type { AiConfig, AiProviderPreset, AppSettings } from "@/types/settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "@/lib/toast";

const DEFAULT_CONFIG: AiConfig = {
  providerPreset: "grok",
  baseUrl: PROVIDER_PRESETS.grok.baseUrl,
  model: PROVIDER_PRESETS.grok.defaultModel,
  temperature: 0.7,
  maxContextWeeks: 4,
  streaming: true,
};

const FEATURE_LABELS: Record<AiFeatureKey, string> = {
  chat: "Chat",
  reflection: "Weekly reflection",
  tagging: "Tag suggestions",
  categorization: "Task categorization",
  "time-estimate": "Time estimates",
  "planned-suggest": "Planned task suggestions",
  "quick-log": "Quick log",
};

function settingsFingerprint(
  profiles: AiProviderProfile[],
  routing: AiFeatureRouting | undefined,
): string {
  return JSON.stringify({ profiles, routing });
}

function headersToText(headers?: Record<string, string>): string {
  if (!headers) return "";
  return Object.entries(headers)
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");
}

function parseHeadersText(text: string): Record<string, string> | undefined {
  const headers: Record<string, string> = {};
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (key) headers[key] = value;
  }
  return Object.keys(headers).length > 0 ? headers : undefined;
}

function normalizeRouting(
  routing: AiFeatureRouting | undefined,
  profiles: AiProviderProfile[],
): AiFeatureRouting {
  const fallbackId = profiles[0]?.id;
  if (!fallbackId) {
    throw new Error("At least one AI profile is required");
  }
  return Object.fromEntries(
    AI_FEATURE_KEYS.map((key) => [
      key,
      routing?.[key] && profiles.some((p) => p.id === routing[key])
        ? routing[key]
        : fallbackId,
    ]),
  ) as AiFeatureRouting;
}

function draftProfile(profile: AiProviderProfile): AiProviderProfile {
  return {
    ...profile,
    baseUrl: profile.baseUrl.trim(),
    model: profile.model.trim(),
    customSystemPrompt: profile.customSystemPrompt?.trim() || undefined,
    streaming: false,
  };
}

function buildTestSettings(
  settings: AppSettings,
  profile: AiProviderProfile,
): AppSettings {
  return {
    ...settings,
    aiProfiles: [profile],
    aiFeatureRouting: defaultRoutingForProfile(profile.id),
    aiConfig: undefined,
  };
}

function createDefaultProfile(label: string): AiProviderProfile {
  return profileFromLegacyConfig(DEFAULT_CONFIG, label);
}

export function AiConfigForm() {
  const settings = useLiveQuery(() => db.settings.get("default"));
  const syncedFingerprint = useRef<string | null>(null);

  const [profiles, setProfiles] = useState<AiProviderProfile[]>([]);
  const [featureRouting, setFeatureRouting] = useState<AiFeatureRouting>(
    defaultRoutingForProfile(createDefaultProfile("Default").id),
  );
  const [selectedProfileId, setSelectedProfileId] = useState("");
  const [apiKeyInputs, setApiKeyInputs] = useState<Record<string, string>>({});
  const [headersText, setHeadersText] = useState("");

  useEffect(() => {
    if (settings === undefined) return;

    const migrated = migrateSettingsAi(settings);
    let nextProfiles = migrated.aiProfiles ?? [];
    if (nextProfiles.length === 0) {
      nextProfiles = [createDefaultProfile("Default")];
    }

    const nextRouting = normalizeRouting(
      migrated.aiFeatureRouting,
      nextProfiles,
    );
    const fingerprint = settingsFingerprint(nextProfiles, nextRouting);
    if (syncedFingerprint.current === fingerprint) return;

    syncedFingerprint.current = fingerprint;
    setProfiles(nextProfiles);
    setFeatureRouting(nextRouting);
    setSelectedProfileId((current) => {
      if (current && nextProfiles.some((p) => p.id === current)) return current;
      return nextProfiles[0].id;
    });
    setApiKeyInputs({});
  }, [settings]);

  const selectedProfile =
    profiles.find((p) => p.id === selectedProfileId) ?? profiles[0];

  function selectProfile(profile: AiProviderProfile) {
    setSelectedProfileId(profile.id);
    setHeadersText(headersToText(profile.optionalHeaders));
  }

  const [testing, setTesting] = useState(false);
  const [probing, setProbing] = useState(false);
  const [testResult, setTestResult] = useState<{
    ok: boolean;
    message: string;
    sample?: string;
  } | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedOk, setSavedOk] = useState(false);

  const presetConfig = selectedProfile
    ? PROVIDER_PRESETS[selectedProfile.providerPreset]
    : PROVIDER_PRESETS.grok;

  function updateSelectedProfile(patch: Partial<AiProviderProfile>) {
    if (!selectedProfile) return;
    setProfiles((prev) =>
      prev.map((p) => (p.id === selectedProfile.id ? { ...p, ...patch } : p)),
    );
  }

  function applyPreset(preset: AiProviderPreset) {
    if (!selectedProfile) return;
    const patch: Partial<AiProviderProfile> = { providerPreset: preset };
    if (preset !== "custom") {
      const cfg = PROVIDER_PRESETS[preset];
      patch.baseUrl = cfg.baseUrl;
      patch.model = cfg.defaultModel;
    }
    updateSelectedProfile(patch);
  }

  function handleAddProfile() {
    const profile = createDefaultProfile(`Profile ${profiles.length + 1}`);
    setProfiles((prev) => [...prev, profile]);
    selectProfile(profile);
  }

  function handleDeleteProfile(id: string) {
    if (profiles.length <= 1) return;

    const nextProfiles = profiles.filter((p) => p.id !== id);
    const fallbackId = nextProfiles[0].id;

    setProfiles(nextProfiles);
    setFeatureRouting((prev) => {
      const next = { ...prev };
      for (const key of AI_FEATURE_KEYS) {
        if (next[key] === id) next[key] = fallbackId;
      }
      return next;
    });
    setApiKeyInputs((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    if (selectedProfileId === id) {
      const fallback = nextProfiles.find((p) => p.id === fallbackId);
      if (fallback) selectProfile(fallback);
      else setSelectedProfileId(fallbackId);
    }
  }

  async function handleSave() {
    if (!settings || profiles.length === 0) return;

    setSaving(true);
    setSavedOk(false);
    try {
      const profilesToSave = await Promise.all(
        profiles.map(async (profile) => {
          const optionalHeaders =
            profile.id === selectedProfile.id
              ? parseHeadersText(headersText)
              : profile.optionalHeaders;

          const next: AiProviderProfile = {
            ...profile,
            baseUrl: profile.baseUrl.trim(),
            model: profile.model.trim(),
            customSystemPrompt: profile.customSystemPrompt?.trim() || undefined,
            optionalHeaders,
          };
          const apiKey = apiKeyInputs[profile.id];
          if (apiKey?.trim()) {
            next.encryptedApiKey = await encryptApiKey(apiKey.trim());
          }
          return next;
        }),
      );

      const routingToSave = normalizeRouting(featureRouting, profilesToSave);
      const current = await db.settings.get("default");
      if (!current) throw new Error("Settings not found");

      await db.settings.put({
        ...current,
        aiProfiles: profilesToSave,
        aiFeatureRouting: routingToSave,
        aiConfig: undefined,
      });

      syncedFingerprint.current = settingsFingerprint(
        profilesToSave,
        routingToSave,
      );
      setProfiles(profilesToSave);
      setFeatureRouting(routingToSave);
      setApiKeyInputs({});
      setSavedOk(true);
      setTimeout(() => setSavedOk(false), 3000);
      toast.success({
        title: "AI configuration saved",
        description: "Profiles and feature routing are ready to use.",
      });
    } catch (e) {
      toast.error({
        title: "Could not save configuration",
        description: e instanceof Error ? e.message : "Save failed",
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleTest() {
    if (!settings || !selectedProfile) return;

    setTesting(true);
    setTestResult(null);
    try {
      const profile = draftProfile(selectedProfile);
      const result = await testFeatureConnection(
        { settings: buildTestSettings(settings, profile), feature: "chat" },
        apiKeyInputs[selectedProfile.id]?.trim() || undefined,
      );
      setTestResult(result);
      if (result.ok) {
        toast.success({
          title: "Connection successful",
          description: result.message,
        });
      } else {
        toast.error({
          title: "Connection failed",
          description: result.message,
        });
      }
    } finally {
      setTesting(false);
    }
  }

  async function handleTestWithContext() {
    if (!settings || !selectedProfile) return;

    setTesting(true);
    setTestResult(null);
    try {
      const profile = draftProfile(selectedProfile);
      const ctx = await buildContext({
        userMessage: "In one sentence, what patterns do you notice in my week?",
        maxContextWeeks: selectedProfile.maxContextWeeks,
        customSystemPrompt: selectedProfile.customSystemPrompt,
      });

      await new Promise<void>((resolve) => {
        streamFeatureCompletion(
          { settings: buildTestSettings(settings, profile), feature: "chat" },
          { messages: ctx.messages },
          {
            onToken: () => {},
            onDone: (full) => {
              const message = `Context: ${ctx.summary.taskCount} tasks, ${ctx.summary.memoryCount} memories, week ${ctx.summary.weekLabel}`;
              setTestResult({
                ok: true,
                message,
                sample: full.trim(),
              });
              toast.success({
                title: "Context test successful",
                description: message,
              });
              resolve();
            },
            onError: (err) => {
              setTestResult({ ok: false, message: err.message });
              toast.error({
                title: "Context test failed",
                description: err.message,
              });
              resolve();
            },
          },
          apiKeyInputs[selectedProfile.id]?.trim() || undefined,
        );
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Context build failed";
      setTestResult({ ok: false, message });
      toast.error({
        title: "Context test failed",
        description: message,
      });
    } finally {
      setTesting(false);
    }
  }

  async function handleProbeToolCalls() {
    if (!selectedProfile) return;

    setProbing(true);
    try {
      const profile = draftProfile({
        ...selectedProfile,
        optionalHeaders: parseHeadersText(headersText),
      });
      const result = await probeToolCallSupport(
        profile,
        apiKeyInputs[selectedProfile.id]?.trim() || undefined,
      );

      updateSelectedProfile({
        capabilities: {
          supportsToolCalls: result.supportsToolCalls,
          probedAt: new Date().toISOString(),
        },
      });

      toast[result.supportsToolCalls ? "success" : "info"]({
        title: result.supportsToolCalls
          ? "Tool-calls supported"
          : "Tool-calls not supported",
        description: result.message,
      });
    } catch (err) {
      toast.error({
        title: "Capability probe failed",
        description: err instanceof Error ? err.message : "Probe failed",
      });
    } finally {
      setProbing(false);
    }
  }

  if (settings === undefined || !selectedProfile) {
    return (
      <div className="mx-auto max-w-2xl space-y-6 p-6 lg:p-8">
        <div className="h-40 animate-pulse rounded-2xl bg-muted/30" />
      </div>
    );
  }

  const savedApiKey = selectedProfile.encryptedApiKey;
  const apiKeyInput = apiKeyInputs[selectedProfile.id] ?? "";

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6 lg:p-8">
      <Card className="rounded-2xl">
        <CardContent className="space-y-4 p-5">
          <div className="flex flex-wrap items-center gap-2">
            {profiles.map((profile) => (
              <Button
                key={profile.id}
                type="button"
                size="sm"
                variant={
                  profile.id === selectedProfile.id ? "default" : "secondary"
                }
                onClick={() => selectProfile(profile)}
              >
                {profile.label}
              </Button>
            ))}
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleAddProfile}
            >
              <Plus className="h-4 w-4" />
              Add profile
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={profiles.length <= 1}
              onClick={() => handleDeleteProfile(selectedProfile.id)}
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardContent className="space-y-4 p-5">
          <div className="flex items-start gap-3">
            <BookOpen className="mt-0.5 h-5 w-5 text-accent" />
            <div>
              <p className="text-sm font-medium">How to connect</p>
              <ol className="mt-2 list-decimal space-y-1 pl-4 text-xs text-muted-foreground">
                {presetConfig.tutorial.map((step, i) => (
                  <li key={i}>{step}</li>
                ))}
              </ol>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Profile name</Label>
          <Input
            value={selectedProfile.label}
            onChange={(e) => updateSelectedProfile({ label: e.target.value })}
            placeholder="Default"
          />
        </div>

        <div className="space-y-2">
          <Label>Provider</Label>
          <Select
            value={selectedProfile.providerPreset}
            onValueChange={(v) => applyPreset(v as AiProviderPreset)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.values(PROVIDER_PRESETS).map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Base URL</Label>
          <Input
            value={selectedProfile.baseUrl}
            onChange={(e) => updateSelectedProfile({ baseUrl: e.target.value })}
            placeholder="https://api.example.com/v1"
          />
        </div>

        <div className="space-y-2">
          <Label>Model</Label>
          <Input
            value={selectedProfile.model}
            onChange={(e) => updateSelectedProfile({ model: e.target.value })}
            placeholder="model-name"
          />
        </div>

        <div className="space-y-2">
          <Label>
            API key{" "}
            {savedApiKey && !apiKeyInput ? "(saved — enter to replace)" : ""}
          </Label>
          <Input
            type="password"
            value={apiKeyInput}
            onChange={(e) =>
              setApiKeyInputs((prev) => ({
                ...prev,
                [selectedProfile.id]: e.target.value,
              }))
            }
            placeholder={
              selectedProfile.providerPreset === "ollama"
                ? "Optional for local Ollama"
                : "sk-..."
            }
            autoComplete="off"
          />
          <p className="text-xs text-muted-foreground">
            Encrypted in your browser with Web Crypto — never sent anywhere
            except your chosen API.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Temperature</Label>
            <Input
              type="number"
              min={0}
              max={2}
              step={0.1}
              value={String(selectedProfile.temperature)}
              onChange={(e) =>
                updateSelectedProfile({
                  temperature: parseFloat(e.target.value) || 0.7,
                })
              }
            />
          </div>
          <div className="space-y-2">
            <Label>Context weeks</Label>
            <Input
              type="number"
              min={1}
              max={12}
              value={String(selectedProfile.maxContextWeeks)}
              onChange={(e) =>
                updateSelectedProfile({
                  maxContextWeeks: parseInt(e.target.value, 10) || 4,
                })
              }
            />
          </div>
        </div>

        <div className="flex items-center justify-between rounded-2xl bg-muted/30 px-4 py-3">
          <Label>Streaming responses</Label>
          <Switch
            checked={selectedProfile.streaming}
            onCheckedChange={(checked) =>
              updateSelectedProfile({ streaming: checked })
            }
          />
        </div>

        <div className="space-y-2">
          <Label>Custom system prompt (optional)</Label>
          <textarea
            value={selectedProfile.customSystemPrompt ?? ""}
            onChange={(e) =>
              updateSelectedProfile({
                customSystemPrompt: e.target.value || undefined,
              })
            }
            rows={3}
            className="flex w-full rounded-2xl border border-border bg-muted/30 px-4 py-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            placeholder="Override the default Hesia persona..."
          />
        </div>

        <div className="space-y-2">
          <Label>Optional headers (one key=value per line)</Label>
          <textarea
            value={headersText}
            onChange={(e) => {
              setHeadersText(e.target.value);
              updateSelectedProfile({
                optionalHeaders: parseHeadersText(e.target.value),
              });
            }}
            rows={3}
            className="flex w-full rounded-2xl border border-border bg-muted/30 px-4 py-3 font-mono text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            placeholder={"HTTP-Referer=https://hesia.app\nX-Title=Hesia"}
          />
        </div>

        {selectedProfile.capabilities?.supportsToolCalls !== undefined && (
          <p className="text-xs text-muted-foreground">
            Tool-calls:{" "}
            {selectedProfile.capabilities.supportsToolCalls
              ? "Supported"
              : "Not supported"}
            {selectedProfile.capabilities.probedAt
              ? ` (last probed ${new Date(selectedProfile.capabilities.probedAt).toLocaleString()})`
              : null}
          </p>
        )}
      </div>

      <Card className="rounded-2xl">
        <CardContent className="space-y-4 p-5">
          <div>
            <p className="text-sm font-medium">Feature routing</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Choose which profile handles each AI feature.
            </p>
          </div>
          {AI_FEATURE_KEYS.map((key) => (
            <div
              key={key}
              className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
            >
              <Label className="shrink-0">{FEATURE_LABELS[key]}</Label>
              <Select
                value={featureRouting[key]}
                onValueChange={(value) =>
                  setFeatureRouting((prev) => ({ ...prev, [key]: value }))
                }
              >
                <SelectTrigger className="w-full sm:max-w-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {profiles.map((profile) => (
                    <SelectItem key={profile.id} value={profile.id}>
                      {profile.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-3">
        <Button
          onClick={() => void handleTest()}
          disabled={
            testing || !selectedProfile.baseUrl.trim() || !selectedProfile.model.trim()
          }
        >
          {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Test connection
        </Button>
        <Button
          variant="secondary"
          onClick={() => void handleTestWithContext()}
          disabled={testing}
        >
          Test with sample context
        </Button>
        <Button
          variant="secondary"
          onClick={() => void handleProbeToolCalls()}
          disabled={
            probing ||
            !selectedProfile.baseUrl.trim() ||
            !selectedProfile.model.trim()
          }
        >
          {probing ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Probe tool-calls
        </Button>
        <Button onClick={() => void handleSave()} disabled={saving}>
          {saving ? "Saving..." : savedOk ? "Saved ✓" : "Save configuration"}
        </Button>
      </div>

      {testResult && (
        <Card
          className={`rounded-2xl ${testResult.ok ? "border-planned/30" : "border-unplanned/30"}`}
        >
          <CardContent className="flex items-start gap-3 p-4">
            {testResult.ok ? (
              <CheckCircle2 className="h-5 w-5 shrink-0 text-planned" />
            ) : (
              <XCircle className="h-5 w-5 shrink-0 text-unplanned" />
            )}
            <div>
              <p className="text-sm font-medium">{testResult.message}</p>
              {testResult.sample && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {testResult.sample}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}