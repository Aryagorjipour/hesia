# Hesia Relay

Local-only companion service for Hesia. Runs on **your machine** with Bun — never deployed to a hosted backend.

## What it does

- **SMTP email** — send weekly reflections from the browser via a localhost HTTP API
- **MCP bridge** — connect external MCP servers (stdio/SSE) for AI tool use
- **Built-in tools** — `hesia_send_email`, `hesia_relay_health`

## Security

- Binds to `127.0.0.1` only (refuses other hosts)
- CORS limited to localhost origins
- SMTP credentials live in `config.json` on disk — never in the browser

## Setup

```bash
cd relay
bun install
cp config.example.json config.json
# Edit config.json with your SMTP provider
bun run start
```

From the repo root:

```bash
npm run relay        # production
npm run relay:dev    # watch mode
```

## SMTP providers

Use any SMTP-compatible provider you can reach from your network. For users in sanctioned regions, prefer:

- Self-hosted mail (Postfix, Mailcow)
- Regional providers not blocked in your jurisdiction
- Local test: [Mailpit](https://mailpit.axllent.org/) or similar catch-all SMTP

**Cloud transactional email** (SendGrid, Resend, AWS SES) is supported via SMTP credentials but is optional — see `documentations/integrations.md`.

## MCP servers

Add entries under `mcpServers` in `config.json`. Example stdio server:

```json
{
  "id": "filesystem",
  "name": "Filesystem",
  "transport": "stdio",
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-filesystem", "/home/you/projects"],
  "enabled": true
}
```

The browser stores MCP server *metadata* in Dexie; the relay spawns stdio processes and proxies SSE/HTTP endpoints.

## API

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Relay status |
| POST | `/email/send` | `{ to, subject, text, html? }` |
| GET | `/mcp/tools` | List bridged tools |
| POST | `/mcp/call` | `{ serverId, name, arguments }` |

## License

MIT — same as Hesia