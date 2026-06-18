"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { v4 as uuidv4 } from "uuid";
import {
  Cable,
  Loader2,
  Mail,
  Plus,
  Server,
  Trash2,
  Wifi,
  WifiOff,
} from "lucide-react";
import { db } from "@/lib/db/schema";
import { checkRelayHealth } from "@/lib/mcp/client";
import { RelayCompanionGuide } from "@/features/settings/relay-companion-guide";
import { RelaySmtpPanel } from "@/features/settings/relay-smtp-panel";
import { toast } from "@/lib/toast";
import type { McpServerConfig } from "@/types/mcp";
import { DEFAULT_LOCALE_SETTINGS } from "@/lib/i18n/locale-defaults";
import type { LocaleSettings } from "@/types/settings";
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

export function IntegrationsView() {
  const settings = useLiveQuery(() => db.settings.get("default"));
  const [saving, setSaving] = useState(false);
  const [probing, setProbing] = useState(false);
  const [relayStatus, setRelayStatus] = useState<{
    ok: boolean;
    smtpConfigured?: boolean;
  } | null>(null);
  const [smtpRefreshKey, setSmtpRefreshKey] = useState(0);

  const relay = settings?.relay ?? { enabled: false, url: "http://127.0.0.1:8787" };
  const locale: LocaleSettings = settings?.locale ?? DEFAULT_LOCALE_SETTINGS;
  const mcpServers = settings?.mcpServers ?? [];

  async function persist(patch: Record<string, unknown>) {
    if (!settings) return;
    setSaving(true);
    try {
      await db.settings.put({ ...settings, ...patch });
    } catch (err) {
      toast.error({
        title: "Could not save",
        description: err instanceof Error ? err.message : "Save failed",
      });
    } finally {
      setSaving(false);
    }
  }

  async function probeRelay() {
    setProbing(true);
    try {
      const health = await checkRelayHealth(relay.url);
      setRelayStatus({
        ok: health.ok,
        smtpConfigured: health.smtpConfigured,
      });
      if (health.ok) {
        toast.success({
          title: "Companion connected",
          description: health.smtpConfigured
            ? "Email is ready to send."
            : "Companion is running — add your email settings below.",
        });
      } else {
        toast.warning({
          title: "Companion not running",
          description:
            "Start Hesia Companion on this computer, then test again.",
        });
      }
    } finally {
      setProbing(false);
    }
  }

  function addMcpServer() {
    const entry: McpServerConfig = {
      id: uuidv4(),
      name: "New MCP server",
      transport: "sse",
      url: "http://127.0.0.1:3001/sse",
      enabled: false,
    };
    void persist({ mcpServers: [...mcpServers, entry] });
  }

  function updateMcpServer(id: string, patch: Partial<McpServerConfig>) {
    void persist({
      mcpServers: mcpServers.map((s) =>
        s.id === id ? { ...s, ...patch } : s,
      ),
    });
  }

  function removeMcpServer(id: string) {
    void persist({ mcpServers: mcpServers.filter((s) => s.id !== id) });
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-border bg-card/50 p-4 sm:p-5">
        <div className="mb-4 flex items-center gap-2">
          <Cable className="h-4 w-4 text-accent" />
          <div>
            <h2 className="text-sm font-medium text-foreground">
              Locale & display
            </h2>
            <p className="text-xs text-muted-foreground">
              Calendar system and reading direction
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Calendar</Label>
            <Select
              value={locale.calendar}
              onValueChange={(v) =>
                void persist({
                  locale: {
                    ...locale,
                    calendar: v as LocaleSettings["calendar"],
                  },
                })
              }
              disabled={saving}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="jalali">Jalali (شمسی)</SelectItem>
                <SelectItem value="gregorian">Gregorian</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Direction</Label>
            <Select
              value={locale.direction}
              onValueChange={(v) =>
                void persist({
                  locale: {
                    ...locale,
                    direction: v as LocaleSettings["direction"],
                  },
                })
              }
              disabled={saving}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="rtl">RTL (right-to-left)</SelectItem>
                <SelectItem value="ltr">LTR (left-to-right)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card/50 p-4 sm:p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-accent" />
            <div>
              <h2 className="text-sm font-medium text-foreground">
                Email & companion
              </h2>
              <p className="text-xs text-muted-foreground">
                Send reports from Hesía via your own email account
              </p>
            </div>
          </div>
          <Switch
            checked={relay.enabled}
            onCheckedChange={(v) =>
              void persist({ relay: { ...relay, enabled: v } })
            }
            disabled={saving}
          />
        </div>

        <div className="space-y-4">
          {!relay.enabled ? (
            <p className="rounded-xl border border-dashed border-border/70 bg-muted/10 p-4 text-sm text-muted-foreground">
              Turn on the switch above to send weekly reports and other email
              directly from Hesía.
            </p>
          ) : (
            <>
          <RelayCompanionGuide />

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="gap-1.5"
              onClick={() => void probeRelay()}
              disabled={probing}
            >
              {probing ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : relayStatus?.ok ? (
                <Wifi className="h-3.5 w-3.5 text-planned" />
              ) : (
                <WifiOff className="h-3.5 w-3.5" />
              )}
              Test connection
            </Button>
            {relayStatus && (
              <span className="text-xs text-muted-foreground">
                {relayStatus.ok
                  ? relayStatus.smtpConfigured
                    ? "Connected · email ready"
                    : "Connected · set up email below"
                  : "Companion not detected"}
              </span>
            )}
          </div>

          <RelaySmtpPanel
            relayUrl={relay.url}
            relayReachable={relayStatus?.ok ?? false}
            refreshKey={smtpRefreshKey}
            onSaved={() => {
              setSmtpRefreshKey((k) => k + 1);
              void probeRelay();
            }}
          />

          <details className="rounded-xl border border-border/50 bg-muted/5 px-3 py-2 text-xs text-muted-foreground">
            <summary className="cursor-pointer py-1 text-foreground">
              Troubleshooting
            </summary>
            <div className="space-y-2 pb-2 pt-1 leading-relaxed">
              <p>
                Companion address (usually leave as default):{" "}
                <code className="rounded bg-muted px-1">{relay.url}</code>
              </p>
              <Label htmlFor="relay-url" className="sr-only">
                Companion URL
              </Label>
              <Input
                id="relay-url"
                value={relay.url}
                onChange={(e) =>
                  void persist({ relay: { ...relay, url: e.target.value } })
                }
                placeholder="http://127.0.0.1:8787"
                disabled={saving}
                className="h-8 text-xs"
              />
            </div>
          </details>
            </>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card/50 p-4 sm:p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Server className="h-4 w-4 text-accent" />
            <div>
              <h2 className="text-sm font-medium text-foreground">
                MCP servers
              </h2>
              <p className="text-xs text-muted-foreground">
                Metadata stored locally — relay spawns stdio / proxies SSE
              </p>
            </div>
          </div>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="gap-1.5"
            onClick={addMcpServer}
            disabled={saving}
          >
            <Plus className="h-3.5 w-3.5" />
            Add
          </Button>
        </div>

        {mcpServers.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No MCP servers yet. Add one to extend AI tools via the local relay.
          </p>
        ) : (
          <div className="space-y-3">
            {mcpServers.map((server) => (
              <div
                key={server.id}
                className="rounded-xl border border-border/60 bg-muted/10 p-3"
              >
                <div className="mb-3 flex items-center justify-between gap-2">
                  <Input
                    value={server.name}
                    onChange={(e) =>
                      updateMcpServer(server.id, { name: e.target.value })
                    }
                    className="h-8 max-w-[200px] text-sm"
                    aria-label="Server name"
                  />
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={server.enabled}
                      onCheckedChange={(v) =>
                        updateMcpServer(server.id, { enabled: v })
                      }
                      aria-label={`Enable ${server.name}`}
                    />
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-muted-foreground hover:text-red-400"
                      onClick={() => removeMcpServer(server.id)}
                      aria-label={`Remove ${server.name}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Transport</Label>
                    <Select
                      value={server.transport}
                      onValueChange={(v) =>
                        updateMcpServer(server.id, {
                          transport: v as McpServerConfig["transport"],
                        })
                      }
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="stdio">stdio</SelectItem>
                        <SelectItem value="sse">SSE</SelectItem>
                        <SelectItem value="http">HTTP</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {server.transport === "stdio" ? (
                    <div className="space-y-1 sm:col-span-2">
                      <Label className="text-xs">Command</Label>
                      <Input
                        value={server.command ?? ""}
                        onChange={(e) =>
                          updateMcpServer(server.id, {
                            command: e.target.value,
                          })
                        }
                        placeholder="npx"
                        className="h-8"
                      />
                    </div>
                  ) : (
                    <div className="space-y-1 sm:col-span-2">
                      <Label className="text-xs">URL</Label>
                      <Input
                        value={server.url ?? ""}
                        onChange={(e) =>
                          updateMcpServer(server.id, { url: e.target.value })
                        }
                        placeholder="http://127.0.0.1:3001/sse"
                        className="h-8"
                      />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <p className="mt-4 text-xs text-muted-foreground">
          Bot integrations (Telegram, Discord) are reserved extension slots — see{" "}
          <code className="rounded bg-muted px-1">integration-extensions.ts</code>.
        </p>
      </section>
    </div>
  );
}