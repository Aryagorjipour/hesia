# MCP in Hesia

[Model Context Protocol](https://modelcontextprotocol.io) lets AI clients call tools on external systems. Hesia stores MCP **configuration** in the browser and delegates execution to the **local relay**.

## Data model (Dexie v8)

```ts
mcpServers: Array<{
  id: string;           // uuid
  name: string;
  transport: "stdio" | "sse" | "http";
  command?: string;     // stdio only
  args?: string[];
  url?: string;         // sse/http
  env?: Record<string, string>;
  enabled: boolean;
  description?: string;
}>
```

Manage servers in **Settings → Integrations**.

## Runtime flow

1. User enables relay and MCP servers in settings
2. Relay reads `mcpServers` from its own `config.json` for process spawning
3. Browser calls `GET /mcp/tools` and `POST /mcp/call` on localhost
4. `buildMcpContext()` injects tool summaries into AI prompts when configured

## Client modules

| File | Role |
|------|------|
| `src/types/mcp.ts` | Zod schemas |
| `src/lib/mcp/client.ts` | HTTP client to relay |
| `src/lib/mcp/mcp-context.ts` | Prompt context builder |
| `relay/mcp-bridge.ts` | SDK client, stdio/SSE transport |
| `relay/hesia-tools.ts` | Built-in relay tools |

## Built-in relay tools

| Tool | Args | Returns |
|------|------|---------|
| `hesia_send_email` | `to`, `subject`, `text`, `html?` | `{ messageId }` |
| `hesia_relay_health` | — | `{ ok, smtpConfigured }` |

`serverId` for built-ins is `hesia-relay`.

## Example stdio server

`relay/config.json`:

```json
{
  "mcpServers": [
    {
      "id": "fs",
      "name": "Filesystem",
      "transport": "stdio",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/tmp"],
      "enabled": true
    }
  ]
}
```

## Security notes

- MCP servers run with **your user permissions** on the host machine
- Only enable servers you trust
- Relay binds `127.0.0.1` — not exposed to LAN/WAN by default
- Tool output may contain sensitive paths — review before sending to cloud LLMs

## Sanctions-aware usage

The MCP SDK and reference servers are open-source npm packages. Install via npm/bun mirrors if registry access is restricted. Stdio servers need no US-cloud API keys unless you configure tools that require them.