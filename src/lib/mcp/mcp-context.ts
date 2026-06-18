import type { AppSettings } from "@/types/settings";
import type { McpTool } from "@/types/mcp";
import { listMcpTools } from "./client";

export interface McpContextOptions {
  maxTools?: number;
  includeDescriptions?: boolean;
}

/**
 * Build a compact MCP tool listing for AI system prompts.
 * Only queries the local relay when relay is enabled.
 */
export async function buildMcpContext(
  settings: AppSettings | undefined,
  options: McpContextOptions = {},
): Promise<string> {
  const { maxTools = 24, includeDescriptions = true } = options;

  if (!settings?.relay?.enabled || !settings.relay.url) {
    return "";
  }

  const enabledServers = (settings.mcpServers ?? []).filter((s) => s.enabled);
  if (enabledServers.length === 0) {
    return [
      "## AI tools",
      "Companion is enabled but no tool connections are set up.",
      "Add a connection in Settings → Integrations → AI tools.",
    ].join("\n");
  }

  let tools: McpTool[] = [];
  try {
    tools = await listMcpTools(settings.relay.url);
  } catch {
    return [
      "## AI tools",
      "Hesia Companion is enabled but not running on this computer.",
      "Start Companion and check Settings → Integrations.",
    ].join("\n");
  }

  if (tools.length === 0) {
    return [
      "## AI tools",
      `Connections: ${enabledServers.map((s) => s.name).join(", ")}`,
      "No tools available yet — test each connection in Settings → Integrations.",
    ].join("\n");
  }

  const lines = [
    "## AI tools (via Hesia Companion on this computer)",
    `Connections: ${enabledServers.map((s) => s.name).join(", ")}`,
    "",
  ];

  for (const tool of tools.slice(0, maxTools)) {
    const prefix = tool.serverName ? `[${tool.serverName}] ` : "";
    if (includeDescriptions && tool.description) {
      lines.push(`- **${prefix}${tool.name}**: ${tool.description}`);
    } else {
      lines.push(`- ${prefix}${tool.name}`);
    }
  }

  if (tools.length > maxTools) {
    lines.push(`… and ${tools.length - maxTools} more`);
  }

  return lines.join("\n");
}