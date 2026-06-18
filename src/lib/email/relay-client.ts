import {
  McpToolCallResultSchema,
  McpToolSchema,
  RelayHealthSchema,
  type McpTool,
  type McpToolCallResult,
  type RelayHealth,
} from "@/types/mcp";
import { platformInvoke } from "@/lib/platform/invoke";

const DEFAULT_TIMEOUT_MS = 12_000;

async function relayFetch<T>(
  relayUrl: string,
  path: string,
  init?: RequestInit,
): Promise<T> {
  const base = relayUrl.replace(/\/$/, "");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const res = await fetch(`${base}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(body || `Relay error ${res.status}`);
    }

    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

export async function checkRelayHealth(
  relayUrl: string,
): Promise<RelayHealth> {
  try {
    const data = await platformInvoke<unknown>(
      "relay_health",
      {},
      () => relayFetch<unknown>(relayUrl, "/health"),
    );
    const parsed = RelayHealthSchema.safeParse(data);
    return parsed.success
      ? parsed.data
      : { ok: true, smtpConfigured: false, mcpBridgeReady: false };
  } catch {
    return { ok: false };
  }
}

export interface SendEmailPayload {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export async function sendEmailViaRelay(
  relayUrl: string,
  payload: SendEmailPayload,
): Promise<{ ok: boolean; messageId?: string; error?: string }> {
  try {
    const data = await platformInvoke<{
      ok: boolean;
      messageId?: string;
      error?: string;
    }>(
      "smtp_send",
      payload as unknown as Record<string, unknown>,
      () =>
        relayFetch<{ ok: boolean; messageId?: string; error?: string }>(
          relayUrl,
          "/email/send",
          { method: "POST", body: JSON.stringify(payload) },
        ),
    );
    return data;
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Relay unreachable",
    };
  }
}

export async function listMcpTools(relayUrl: string): Promise<McpTool[]> {
  try {
    const data = await platformInvoke<{ tools: unknown[] }>(
      "mcp_tools",
      {},
      () => relayFetch<{ tools: unknown[] }>(relayUrl, "/mcp/tools"),
    );
    const tools: McpTool[] = [];
    for (const raw of data.tools ?? []) {
      const parsed = McpToolSchema.safeParse(raw);
      if (parsed.success) tools.push(parsed.data);
    }
    return tools;
  } catch {
    return [];
  }
}

export async function callMcpTool(
  relayUrl: string,
  serverId: string,
  name: string,
  args: Record<string, unknown> = {},
): Promise<McpToolCallResult> {
  try {
    const data = await platformInvoke<unknown>(
      "mcp_call",
      { serverId, name, arguments: args },
      () =>
        relayFetch<unknown>(relayUrl, "/mcp/call", {
          method: "POST",
          body: JSON.stringify({ serverId, name, arguments: args }),
        }),
    );
    const parsed = McpToolCallResultSchema.safeParse(data);
    if (parsed.success) return parsed.data;
    return {
      ok: false,
      content: [],
      error: "Invalid response from relay MCP bridge",
    };
  } catch (err) {
    return {
      ok: false,
      content: [],
      error: err instanceof Error ? err.message : "MCP call failed",
    };
  }
}
