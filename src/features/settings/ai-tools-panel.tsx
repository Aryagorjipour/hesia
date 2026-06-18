"use client";

import { useEffect, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import {
  CheckCircle2,
  CircleAlert,
  FolderOpen,
  Globe,
  Loader2,
  Plus,
  Sparkles,
  Trash2,
  Wrench,
} from "lucide-react";
import { toast } from "@/lib/toast";
import { listMcpTools } from "@/lib/mcp/client";
import {
  fetchRelayMcpServers,
  saveRelayMcpServers,
} from "@/lib/mcp/mcp-relay-api";
import {
  AI_TOOL_PRESETS,
  buildFilesystemServer,
  buildRemoteServer,
  detectAiToolKind,
  getFilesystemFolder,
  getPresetById,
  type AiToolKind,
} from "@/lib/mcp/ai-tool-presets";
import type { McpServerConfig } from "@/types/mcp";
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

const PRESET_ICONS: Record<AiToolKind, typeof FolderOpen> = {
  filesystem: FolderOpen,
  remote: Globe,
  custom: Wrench,
};

interface AiToolsPanelProps {
  relayUrl: string;
  relayEnabled: boolean;
  relayReachable: boolean;
  servers: McpServerConfig[];
  onServersChange: (servers: McpServerConfig[]) => Promise<void>;
  saving: boolean;
  refreshKey?: number;
}

export function AiToolsPanel({
  relayUrl,
  relayEnabled,
  relayReachable,
  servers,
  onServersChange,
  saving,
  refreshKey = 0,
}: AiToolsPanelProps) {
  const [loading, setLoading] = useState(relayReachable);
  const [syncing, setSyncing] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [addingKind, setAddingKind] = useState<AiToolKind | null>(null);
  const [draftName, setDraftName] = useState("");
  const [draftPath, setDraftPath] = useState("");
  const [draftUrl, setDraftUrl] = useState("");

  useEffect(() => {
    let cancelled = false;
    if (!relayReachable || !relayEnabled) {
      Promise.resolve().then(() => {
        if (!cancelled) setLoading(false);
      });
      return () => {
        cancelled = true;
      };
    }

    fetchRelayMcpServers(relayUrl)
      .then((remote) => {
        if (cancelled) return;
        if (remote.length === 0 && servers.length > 0) {
          void syncToCompanion(servers);
          return;
        }
        if (remote.length === 0) return;
        const local = JSON.stringify(servers);
        const fromCompanion = JSON.stringify(remote);
        if (local !== fromCompanion) {
          void onServersChange(remote);
        }
      })
      .catch(() => {
        /* keep local Dexie copy */
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refresh on companion probe only
  }, [relayReachable, relayEnabled, relayUrl, refreshKey]);

  async function syncToCompanion(next: McpServerConfig[]) {
    if (!relayReachable) return;
    setSyncing(true);
    try {
      await saveRelayMcpServers(relayUrl, next);
    } catch (err) {
      toast.warning({
        title: "Saved locally",
        description:
          err instanceof Error
            ? `${err.message} — start Companion and save again to activate tools.`
            : "Companion could not be updated. Try again when it is running.",
      });
    } finally {
      setSyncing(false);
    }
  }

  async function applyServers(next: McpServerConfig[]) {
    await onServersChange(next);
    if (relayReachable) {
      await syncToCompanion(next);
    }
  }

  function startAdd(kind: AiToolKind) {
    const preset = getPresetById(kind);
    setAddingKind(kind);
    setDraftName(preset.defaultName);
    setDraftPath("");
    setDraftUrl("http://127.0.0.1:3001/sse");
  }

  function cancelAdd() {
    setAddingKind(null);
    setDraftName("");
    setDraftPath("");
    setDraftUrl("");
  }

  async function confirmAdd() {
    if (!addingKind) return;

    if (addingKind === "filesystem" && !draftPath.trim()) {
      toast.warning({
        title: "Choose a folder",
        description: "Enter the full path to the folder the AI may access.",
      });
      return;
    }

    if (addingKind === "remote" && !draftUrl.trim()) {
      toast.warning({
        title: "Enter a server address",
        description: "Paste the URL your tool provider gave you.",
      });
      return;
    }

    const id = uuidv4();
    let entry: McpServerConfig;

    if (addingKind === "filesystem") {
      entry = buildFilesystemServer(id, draftName, draftPath, true);
    } else if (addingKind === "remote") {
      entry = buildRemoteServer(id, draftName, draftUrl, true);
    } else {
      entry = {
        id,
        name: draftName.trim() || "Custom tools",
        transport: "sse",
        url: draftUrl.trim() || "http://127.0.0.1:3001/sse",
        enabled: false,
        description: "Custom connection",
      };
    }

    await applyServers([...servers, entry]);
    cancelAdd();
    toast.success({
      title: "Connection added",
      description: entry.enabled
        ? "Turn on Companion to activate it, then test the connection."
        : "Enable it when you are ready.",
    });
  }

  async function updateServer(id: string, patch: Partial<McpServerConfig>) {
    await applyServers(
      servers.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    );
  }

  async function removeServer(id: string) {
    await applyServers(servers.filter((s) => s.id !== id));
  }

  async function testServer(server: McpServerConfig) {
    if (!relayReachable) {
      toast.warning({
        title: "Companion not running",
        description: "Start Hesia Companion on this computer, then test again.",
      });
      return;
    }

    setTestingId(server.id);
    try {
      const tools = await listMcpTools(relayUrl);
      const fromServer = tools.filter((t) => t.serverId === server.id);
      if (fromServer.length > 0) {
        toast.success({
          title: `${server.name} is working`,
          description: `Found ${fromServer.length} tool${fromServer.length === 1 ? "" : "s"}: ${fromServer
            .slice(0, 3)
            .map((t) => t.name)
            .join(", ")}${fromServer.length > 3 ? "…" : ""}`,
        });
      } else if (tools.length > 0) {
        toast.warning({
          title: "Connected, but no tools from this connection",
          description:
            "Companion is running. Check the folder path or server address, then try again.",
        });
      } else {
        toast.warning({
          title: "No tools available yet",
          description:
            "Enable the connection and make sure Companion can reach the folder or server.",
        });
      }
    } finally {
      setTestingId(null);
    }
  }

  const enabledCount = servers.filter((s) => s.enabled).length;

  if (!relayEnabled) {
    return (
      <p className="rounded-xl border border-dashed border-border/70 bg-muted/10 p-4 text-sm text-muted-foreground">
        Turn on <span className="text-foreground">Email & companion</span>{" "}
        above first — AI tools run through the same Hesia Companion app on your
        computer.
      </p>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading AI tool connections…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div
        className={`flex items-start gap-2 rounded-xl border p-3 text-sm ${
          relayReachable && enabledCount > 0
            ? "border-planned/30 bg-planned/5"
            : "border-border/60 bg-muted/10"
        }`}
      >
        {relayReachable && enabledCount > 0 ? (
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-planned" />
        ) : (
          <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
        )}
        <div>
          <p className="font-medium text-foreground">
            {enabledCount > 0
              ? `${enabledCount} connection${enabledCount === 1 ? "" : "s"} active`
              : "Extend what the AI can do"}
          </p>
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
            {relayReachable
              ? "Hesía\u2019s AI can use folders and apps you connect here — only on this computer, via Companion."
              : "Start Hesia Companion, then add a connection below."}
          </p>
        </div>
      </div>

      {servers.length === 0 && !addingKind ? (
        <div className="rounded-xl border border-dashed border-border/70 bg-muted/5 p-4 text-center">
          <Sparkles className="mx-auto mb-2 h-5 w-5 text-accent" />
          <p className="text-sm text-foreground">No AI tool connections yet</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Connect a folder or external tool service so Hesía&apos;s assistant can
            help with your real files and workflows.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {servers.map((server) => {
            const kind = detectAiToolKind(server);
            const Icon = PRESET_ICONS[kind];
            const folder = getFilesystemFolder(server);

            return (
              <div
                key={server.id}
                className="rounded-xl border border-border/60 bg-muted/10 p-3"
              >
                <div className="mb-3 flex items-start justify-between gap-2">
                  <div className="flex min-w-0 items-start gap-2">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <Input
                        value={server.name}
                        onChange={(e) =>
                          void updateServer(server.id, { name: e.target.value })
                        }
                        className="h-8 max-w-[220px] text-sm font-medium"
                        aria-label="Connection name"
                        disabled={saving || syncing}
                      />
                      <p className="mt-1 truncate text-xs text-muted-foreground">
                        {kind === "filesystem" && folder
                          ? `Folder: ${folder}`
                          : kind === "remote" && server.url
                            ? server.url
                            : getPresetById(kind).label}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Switch
                      checked={server.enabled}
                      onCheckedChange={(v) =>
                        void updateServer(server.id, { enabled: v })
                      }
                      aria-label={`Enable ${server.name}`}
                      disabled={saving || syncing}
                    />
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-muted-foreground hover:text-red-400"
                      onClick={() => void removeServer(server.id)}
                      aria-label={`Remove ${server.name}`}
                      disabled={saving || syncing}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                {kind === "filesystem" && (
                  <div className="mb-3 space-y-1">
                    <Label className="text-xs">Folder path</Label>
                    <Input
                      value={folder}
                      onChange={(e) =>
                        void updateServer(
                          server.id,
                          buildFilesystemServer(
                            server.id,
                            server.name,
                            e.target.value,
                            server.enabled,
                          ),
                        )
                      }
                      placeholder="/home/you/Documents"
                      className="h-8 text-xs"
                      disabled={saving || syncing}
                    />
                  </div>
                )}

                {kind === "remote" && (
                  <div className="mb-3 space-y-1">
                    <Label className="text-xs">Server address</Label>
                    <Input
                      value={server.url ?? ""}
                      onChange={(e) =>
                        void updateServer(server.id, { url: e.target.value })
                      }
                      placeholder="http://127.0.0.1:3001/sse"
                      className="h-8 text-xs"
                      disabled={saving || syncing}
                    />
                  </div>
                )}

                {kind === "custom" && (
                  <details className="mb-3 rounded-lg border border-border/40 bg-muted/5 px-2 py-1 text-xs">
                    <summary className="cursor-pointer py-1 text-muted-foreground">
                      Advanced settings
                    </summary>
                    <div className="grid gap-2 pb-2 pt-1 sm:grid-cols-2">
                      <div className="space-y-1">
                        <Label className="text-xs">Connection type</Label>
                        <Select
                          value={server.transport}
                          onValueChange={(v) =>
                            void updateServer(server.id, {
                              transport: v as McpServerConfig["transport"],
                            })
                          }
                          disabled={saving || syncing}
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="stdio">Local program</SelectItem>
                            <SelectItem value="sse">Network (SSE)</SelectItem>
                            <SelectItem value="http">Network (HTTP)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {server.transport === "stdio" ? (
                        <div className="space-y-1 sm:col-span-2">
                          <Label className="text-xs">Program command</Label>
                          <Input
                            value={server.command ?? ""}
                            onChange={(e) =>
                              void updateServer(server.id, {
                                command: e.target.value,
                              })
                            }
                            placeholder="npx"
                            className="h-8"
                            disabled={saving || syncing}
                          />
                        </div>
                      ) : (
                        <div className="space-y-1 sm:col-span-2">
                          <Label className="text-xs">Server address</Label>
                          <Input
                            value={server.url ?? ""}
                            onChange={(e) =>
                              void updateServer(server.id, {
                                url: e.target.value,
                              })
                            }
                            className="h-8"
                            disabled={saving || syncing}
                          />
                        </div>
                      )}
                    </div>
                  </details>
                )}

                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={
                    !server.enabled ||
                    testingId === server.id ||
                    saving ||
                    syncing
                  }
                  onClick={() => void testServer(server)}
                >
                  {testingId === server.id && (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  )}
                  Test connection
                </Button>
              </div>
            );
          })}
        </div>
      )}

      {addingKind ? (
        <div className="rounded-xl border border-accent/30 bg-accent/5 p-4">
          <p className="mb-3 text-sm font-medium text-foreground">
            Add: {getPresetById(addingKind).label}
          </p>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Name</Label>
              <Input
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                placeholder="My files"
                className="h-8"
              />
            </div>
            {addingKind === "filesystem" && (
              <div className="space-y-1">
                <Label className="text-xs">Folder path</Label>
                <Input
                  value={draftPath}
                  onChange={(e) => setDraftPath(e.target.value)}
                  placeholder="/home/you/Documents"
                  className="h-8"
                />
                <p className="text-xs text-muted-foreground">
                  Only this folder (and subfolders) will be visible to the AI.
                </p>
              </div>
            )}
            {(addingKind === "remote" || addingKind === "custom") && (
              <div className="space-y-1">
                <Label className="text-xs">Server address</Label>
                <Input
                  value={draftUrl}
                  onChange={(e) => setDraftUrl(e.target.value)}
                  placeholder="http://127.0.0.1:3001/sse"
                  className="h-8"
                />
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              <Button type="button" size="sm" onClick={() => void confirmAdd()}>
                <Plus className="h-3.5 w-3.5" />
                Add connection
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={cancelAdd}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid gap-2 sm:grid-cols-3">
          {AI_TOOL_PRESETS.map((preset) => {
            const Icon = PRESET_ICONS[preset.id];
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => startAdd(preset.id)}
                disabled={saving || syncing}
                className="rounded-xl border border-border/60 bg-card/40 p-3 text-left transition-colors hover:border-accent/40 hover:bg-accent/5 disabled:opacity-50"
              >
                <Icon className="mb-2 h-4 w-4 text-accent" />
                <p className="text-sm font-medium text-foreground">
                  {preset.label}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {preset.description}
                </p>
              </button>
            );
          })}
        </div>
      )}

      {(saving || syncing) && (
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" />
          Saving…
        </p>
      )}
    </div>
  );
}