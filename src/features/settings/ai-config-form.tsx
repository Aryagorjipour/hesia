"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { CheckCircle2, XCircle, Loader2, BookOpen } from "lucide-react";
import { db } from "@/lib/db/schema";
import { PROVIDER_PRESETS } from "@/lib/ai/providers";
import { streamChatCompletion } from "@/lib/ai/client";
import { buildContext } from "@/lib/ai/context-builder";
import { encryptApiKey } from "@/lib/crypto/key-vault";
import type { AiConfig, AiProviderPreset } from "@/types/settings";
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

const DEFAULT_CONFIG: AiConfig = {
  providerPreset: "grok",
  baseUrl: PROVIDER_PRESETS.grok.baseUrl,
  model: PROVIDER_PRESETS.grok.defaultModel,
  temperature: 0.7,
  maxContextWeeks: 4,
  streaming: true,
};

export function AiConfigForm() {
  const settings = useLiveQuery(() => db.settings.get("default"));
  const saved = settings?.aiConfig ?? DEFAULT_CONFIG;

  const [preset, setPreset] = useState<AiProviderPreset>(saved.providerPreset);
  const [baseUrl, setBaseUrl] = useState(saved.baseUrl);
  const [model, setModel] = useState(saved.model);
  const [apiKey, setApiKey] = useState("");
  const [temperature, setTemperature] = useState(String(saved.temperature));
  const [maxWeeks, setMaxWeeks] = useState(String(saved.maxContextWeeks));
  const [streaming, setStreaming] = useState(saved.streaming);
  const [customPrompt, setCustomPrompt] = useState(saved.customSystemPrompt ?? "");

  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    ok: boolean;
    message: string;
    sample?: string;
  } | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedOk, setSavedOk] = useState(false);

  const presetConfig = PROVIDER_PRESETS[preset];

  function applyPreset(p: AiProviderPreset) {
    setPreset(p);
    const cfg = PROVIDER_PRESETS[p];
    if (cfg.baseUrl) setBaseUrl(cfg.baseUrl);
    if (cfg.defaultModel) setModel(cfg.defaultModel);
  }

  async function handleSave() {
    setSaving(true);
    setSavedOk(false);
    try {
      const config: AiConfig = {
        providerPreset: preset,
        baseUrl: baseUrl.trim(),
        model: model.trim(),
        temperature: parseFloat(temperature) || 0.7,
        maxContextWeeks: parseInt(maxWeeks, 10) || 4,
        streaming,
        customSystemPrompt: customPrompt.trim() || undefined,
        encryptedApiKey: saved.encryptedApiKey,
      };

      if (apiKey.trim()) {
        config.encryptedApiKey = await encryptApiKey(apiKey.trim());
      }

      await db.settings.update("default", { aiConfig: config });
      setApiKey("");
      setSavedOk(true);
      setTimeout(() => setSavedOk(false), 3000);
    } finally {
      setSaving(false);
    }
  }

  function buildTestConfig(): AiConfig {
    return {
      providerPreset: preset,
      baseUrl: baseUrl.trim(),
      model: model.trim(),
      temperature: parseFloat(temperature) || 0.7,
      maxContextWeeks: parseInt(maxWeeks, 10) || 4,
      streaming: false,
    };
  }

  function runAiTest(
    messages: { role: "system" | "user" | "assistant"; content: string }[],
    successPrefix?: string,
  ): Promise<void> {
    return new Promise((resolve) => {
      streamChatCompletion(
        buildTestConfig(),
        { messages },
        {
          onToken: () => {},
          onDone: (full) => {
            setTestResult({
              ok: true,
              message: successPrefix ?? "Connection successful",
              sample: full.trim(),
            });
            setTesting(false);
            resolve();
          },
          onError: (err) => {
            setTestResult({ ok: false, message: err.message });
            setTesting(false);
            resolve();
          },
        },
        apiKey.trim() || undefined,
      );
    });
  }

  async function handleTest() {
    setTesting(true);
    setTestResult(null);
    await runAiTest([
      { role: "user", content: 'Reply with exactly: "Hesia connection OK"' },
    ]);
  }

  async function handleTestWithContext() {
    setTesting(true);
    setTestResult(null);
    try {
      const ctx = await buildContext({
        userMessage: "In one sentence, what patterns do you notice in my week?",
        maxContextWeeks: parseInt(maxWeeks, 10) || 4,
      });
      await runAiTest(
        ctx.messages,
        `Context: ${ctx.summary.taskCount} tasks, ${ctx.summary.memoryCount} memories, week ${ctx.summary.weekLabel}`,
      );
    } catch (err) {
      setTestResult({
        ok: false,
        message: err instanceof Error ? err.message : "Context build failed",
      });
      setTesting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6 lg:p-8">
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
          <Label>Provider</Label>
          <Select value={preset} onValueChange={(v) => applyPreset(v as AiProviderPreset)}>
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
          <Input value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} placeholder="https://api.example.com/v1" />
        </div>

        <div className="space-y-2">
          <Label>Model</Label>
          <Input value={model} onChange={(e) => setModel(e.target.value)} placeholder="model-name" />
        </div>

        <div className="space-y-2">
          <Label>API key {saved.encryptedApiKey && !apiKey ? "(saved — enter to replace)" : ""}</Label>
          <Input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={preset === "ollama" ? "Optional for local Ollama" : "sk-..."}
            autoComplete="off"
          />
          <p className="text-xs text-muted-foreground">
            Encrypted in your browser with Web Crypto — never sent anywhere except your chosen API.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Temperature</Label>
            <Input type="number" min={0} max={2} step={0.1} value={temperature} onChange={(e) => setTemperature(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Context weeks</Label>
            <Input type="number" min={1} max={12} value={maxWeeks} onChange={(e) => setMaxWeeks(e.target.value)} />
          </div>
        </div>

        <div className="flex items-center justify-between rounded-2xl bg-muted/30 px-4 py-3">
          <Label>Streaming responses</Label>
          <Switch checked={streaming} onCheckedChange={setStreaming} />
        </div>

        <div className="space-y-2">
          <Label>Custom system prompt (optional)</Label>
          <textarea
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            rows={3}
            className="flex w-full rounded-2xl border border-border bg-muted/30 px-4 py-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            placeholder="Override the default Hesia persona..."
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button onClick={() => void handleTest()} disabled={testing || !baseUrl || !model}>
          {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Test connection
        </Button>
        <Button variant="secondary" onClick={() => void handleTestWithContext()} disabled={testing}>
          Test with sample context
        </Button>
        <Button onClick={() => void handleSave()} disabled={saving}>
          {saving ? "Saving..." : savedOk ? "Saved ✓" : "Save configuration"}
        </Button>
      </div>

      {testResult && (
        <Card className={`rounded-2xl ${testResult.ok ? "border-planned/30" : "border-unplanned/30"}`}>
          <CardContent className="flex items-start gap-3 p-4">
            {testResult.ok ? (
              <CheckCircle2 className="h-5 w-5 shrink-0 text-planned" />
            ) : (
              <XCircle className="h-5 w-5 shrink-0 text-unplanned" />
            )}
            <div>
              <p className="text-sm font-medium">{testResult.message}</p>
              {testResult.sample && (
                <p className="mt-1 text-xs text-muted-foreground">{testResult.sample}</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}