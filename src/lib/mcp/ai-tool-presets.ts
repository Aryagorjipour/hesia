import type { McpServerConfig } from "@/types/mcp";

export type AiToolKind = "filesystem" | "remote" | "custom";

export interface AiToolPreset {
  id: AiToolKind;
  label: string;
  description: string;
  defaultName: string;
}

export const AI_TOOL_PRESETS: AiToolPreset[] = [
  {
    id: "filesystem",
    label: "Files on this computer",
    description:
      "Let the AI read and search a folder you choose (documents, projects, notes).",
    defaultName: "My files",
  },
  {
    id: "remote",
    label: "External tool server",
    description:
      "Connect to a tool service that is already running on your network or the web.",
    defaultName: "External tools",
  },
  {
    id: "custom",
    label: "Custom connection",
    description: "Full control for power users — command line or advanced URLs.",
    defaultName: "Custom tools",
  },
];

export function detectAiToolKind(server: McpServerConfig): AiToolKind {
  if (
    server.transport === "stdio" &&
    server.command === "npx" &&
    server.args?.includes("@modelcontextprotocol/server-filesystem")
  ) {
    return "filesystem";
  }
  if (
    (server.transport === "sse" || server.transport === "http") &&
    server.url
  ) {
    return "remote";
  }
  return "custom";
}

export function getFilesystemFolder(server: McpServerConfig): string {
  if (detectAiToolKind(server) !== "filesystem") return "";
  const args = server.args ?? [];
  return args[args.length - 1] ?? "";
}

export function buildFilesystemServer(
  id: string,
  name: string,
  folderPath: string,
  enabled = true,
): McpServerConfig {
  return {
    id,
    name: name.trim() || "My files",
    transport: "stdio",
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-filesystem", folderPath.trim()],
    enabled,
    description: "Folder access on this computer",
  };
}

export function buildRemoteServer(
  id: string,
  name: string,
  url: string,
  enabled = true,
): McpServerConfig {
  return {
    id,
    name: name.trim() || "External tools",
    transport: "sse",
    url: url.trim(),
    enabled,
    description: "External tool server",
  };
}

export function getPresetById(id: AiToolKind): AiToolPreset {
  return AI_TOOL_PRESETS.find((p) => p.id === id) ?? AI_TOOL_PRESETS[0];
}