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
      "## MCP tools",
      "Relay is enabled but no MCP servers are configured.",
      "Add servers in Settings → Integrations.",
    ].join("\n");
  }

  let tools: McpTool[] = [];
  try {
    tools = await listMcpTools(settings.relay.url);
  } catch {
    return [
      "## MCP tools",
      "Hesia Companion is enabled but not running on this computer.",
      "Start the Companion app and check Settings → Integrations.",
    ].join("\n");
  }

  if (tools.length === 0) {
    return [
      "## MCP tools",
      `Configured servers: ${enabledServers.map((s) => s.name).join(", ")}`,
      "No tools reported by the relay bridge yet.",
    ].join("\n");
  }

  const lines = [
    "## MCP tools (via local relay)",
    `Relay: ${settings.relay.url}`,
    `Servers: ${enabledServers.map((s) => s.name).join(", ")}`,
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