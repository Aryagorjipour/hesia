# Hesia Relay

The relay is a **local-only** Bun HTTP service that bridges capabilities the browser cannot safely host: SMTP credentials and MCP stdio processes.

## Architecture

```
┌─────────────┐     HTTP (localhost)     ┌──────────────┐
│ Hesia PWA   │ ───────────────────────► │ hesia-relay  │
│ (browser)   │                          │ 127.0.0.1    │
└─────────────┘                          └──────┬───────┘
                                                │
                                    ┌───────────┴───────────┐
                                    ▼                       ▼
                              SMTP provider           MCP servers
                              (your mail)            (stdio / SSE)
```

## Why localhost only

- SMTP passwords must not live in IndexedDB or static exports
- MCP stdio servers cannot run inside a browser tab
- No hosted backend — you control the machine and network path

The relay **refuses** to bind to non-loopback addresses.

## Quick start

```bash
cd relay
bun install
cp config.example.json config.json
# Edit SMTP section
bun run start
```

From repo root:

```bash
npm run relay       # start
npm run relay:dev   # watch mode
```

Enable the relay in **Settings → Integrations** and set the URL (default `http://127.0.0.1:8787`).

## Endpoints

| Endpoint | Purpose |
|----------|---------|
| `GET /health` | Status, SMTP configured flag |
| `POST /email/send` | Send email via nodemailer |
| `GET /mcp/tools` | List built-in + bridged MCP tools |
| `POST /mcp/call` | Invoke a tool by `serverId` + `name` |

## Built-in MCP tools

| Tool | Description |
|------|-------------|
| `hesia_send_email` | SMTP send via relay config |
| `hesia_relay_health` | Health + SMTP status JSON |

## Fallback behaviour

When relay is disabled or unreachable, Hesia falls back to **`mailto:`** links for report sharing — the user's mail client composes the message locally.

## Dependencies

- [Bun](https://bun.sh) runtime
- [Hono](https://hono.dev) HTTP router
- [nodemailer](https://nodemailer.com) SMTP
- [@modelcontextprotocol/sdk](https://github.com/modelcontextprotocol/typescript-sdk) MCP client

All are installable without US-cloud-only lock-in; use mirrors if needed in sanctioned networks.