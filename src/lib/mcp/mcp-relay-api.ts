import { McpServerConfigSchema, type McpServerConfig } from "@/types/mcp";

async function relayJson<T>(
  relayUrl: string,
  path: string,
  init?: RequestInit,
): Promise<T> {
  const base = relayUrl.replace(/\/$/, "");
  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  const data = (await res.json().catch(() => ({}))) as T & {
    error?: string;
  };

  if (!res.ok) {
    throw new Error(
      (data as { error?: string }).error ??
        `Companion request failed (${res.status})`,
    );
  }

  return data;
}

export async function fetchRelayMcpServers(
  relayUrl: string,
): Promise<McpServerConfig[]> {
  const data = await relayJson<{ ok: boolean; servers: unknown[] }>(
    relayUrl,
    "/mcp/servers",
  );
  const servers: McpServerConfig[] = [];
  for (const raw of data.servers ?? []) {
    const parsed = McpServerConfigSchema.safeParse(raw);
    if (parsed.success) servers.push(parsed.data);
  }
  return servers;
}

export async function saveRelayMcpServers(
  relayUrl: string,
  servers: McpServerConfig[],
): Promise<McpServerConfig[]> {
  const data = await relayJson<{ ok: boolean; servers: unknown[] }>(
    relayUrl,
    "/mcp/servers",
    {
      method: "PUT",
      body: JSON.stringify({ servers }),
    },
  );
  const saved: McpServerConfig[] = [];
  for (const raw of data.servers ?? []) {
    const parsed = McpServerConfigSchema.safeParse(raw);
    if (parsed.success) saved.push(parsed.data);
  }
  return saved;
}