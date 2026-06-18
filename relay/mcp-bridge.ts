import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { findHesiaTool } from "./hesia-tools";
import type { SmtpConfig } from "./smtp";
import { isSmtpConfigured, sendMail } from "./smtp";

export interface RelayMcpServerConfig {
  id: string;
  name: string;
  transport: "stdio" | "sse" | "http";
  command?: string;
  args?: string[];
  url?: string;
  env?: Record<string, string>;
  enabled?: boolean;
}

export interface BridgeTool {
  name: string;
  description?: string;
  inputSchema?: Record<string, unknown>;
  serverId?: string;
  serverName?: string;
}

interface ManagedClient {
  config: RelayMcpServerConfig;
  client: Client;
  transport: StdioClientTransport | SSEClientTransport;
}

const clients = new Map<string, ManagedClient>();

async function connectServer(
  config: RelayMcpServerConfig,
): Promise<ManagedClient> {
  const existing = clients.get(config.id);
  if (existing) return existing;

  let transport: StdioClientTransport | SSEClientTransport;

  if (config.transport === "stdio") {
    if (!config.command) {
      throw new Error(`Server ${config.name} requires a command for stdio`);
    }
    transport = new StdioClientTransport({
      command: config.command,
      args: config.args ?? [],
      env: { ...process.env, ...(config.env ?? {}) },
    });
  } else if (config.transport === "sse" || config.transport === "http") {
    if (!config.url) {
      throw new Error(`Server ${config.name} requires a URL for ${config.transport}`);
    }
    transport = new SSEClientTransport(new URL(config.url));
  } else {
    throw new Error(`Unsupported transport: ${config.transport}`);
  }

  const client = new Client({
    name: "hesia-relay",
    version: "0.1.0",
  });

  await client.connect(transport);
  const managed = { config, client, transport };
  clients.set(config.id, managed);
  return managed;
}

export async function listAllTools(
  servers: RelayMcpServerConfig[],
): Promise<BridgeTool[]> {
  const tools: BridgeTool[] = [];

  for (const def of ["hesia_send_email", "hesia_relay_health"]) {
    const t = findHesiaTool(def);
    if (t) {
      tools.push({
        name: t.name,
        description: t.description,
        inputSchema: t.inputSchema,
        serverId: "hesia-relay",
        serverName: "Hesia Relay",
      });
    }
  }

  for (const server of servers.filter((s) => s.enabled !== false)) {
    try {
      const { client } = await connectServer(server);
      const result = await client.listTools();
      for (const tool of result.tools) {
        tools.push({
          name: tool.name,
          description: tool.description,
          inputSchema: tool.inputSchema as Record<string, unknown>,
          serverId: server.id,
          serverName: server.name,
        });
      }
    } catch (err) {
      console.warn(`[mcp-bridge] Could not list tools for ${server.name}:`, err);
    }
  }

  return tools;
}

export async function callBridgeTool(
  servers: RelayMcpServerConfig[],
  smtp: SmtpConfig | undefined,
  serverId: string,
  name: string,
  args: Record<string, unknown>,
): Promise<{ ok: boolean; content: { type: string; text?: string }[]; error?: string }> {
  if (serverId === "hesia-relay") {
    if (name === "hesia_relay_health") {
      return {
        ok: true,
        content: [
          {
            type: "text",
            text: JSON.stringify({
              ok: true,
              smtpConfigured: isSmtpConfigured(smtp),
            }),
          },
        ],
      };
    }

    if (name === "hesia_send_email") {
      if (!isSmtpConfigured(smtp) || !smtp) {
        return {
          ok: false,
          content: [],
          error: "SMTP not configured in relay config.json",
        };
      }
      const to = String(args.to ?? "");
      const subject = String(args.subject ?? "");
      const text = String(args.text ?? "");
      const html = args.html ? String(args.html) : undefined;
      if (!to || !subject || !text) {
        return { ok: false, content: [], error: "to, subject, and text are required" };
      }
      const result = await sendMail(smtp, { to, subject, text, html });
      return {
        ok: true,
        content: [{ type: "text", text: JSON.stringify({ messageId: result.messageId }) }],
      };
    }
  }

  const server = servers.find((s) => s.id === serverId);
  if (!server) {
    return { ok: false, content: [], error: `Unknown server: ${serverId}` };
  }

  try {
    const { client } = await connectServer(server);
    const result = await client.callTool({ name, arguments: args });
    const content = (result.content ?? []).map((c) => {
      if (c.type === "text") {
        return { type: "text", text: c.text };
      }
      return { type: c.type, text: JSON.stringify(c) };
    });
    return { ok: !result.isError, content, error: result.isError ? "Tool returned error" : undefined };
  } catch (err) {
    return {
      ok: false,
      content: [],
      error: err instanceof Error ? err.message : "MCP tool call failed",
    };
  }
}

export async function shutdownBridge(): Promise<void> {
  for (const [, managed] of clients) {
    try {
      await managed.client.close();
    } catch {
      /* ignore */
    }
  }
  clients.clear();
}