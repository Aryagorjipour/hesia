# Integrations

Hesia integrates with external systems **only through your machine**. There is no Hesía-hosted backend.

## Email

### Local relay (recommended)

1. Configure SMTP in `relay/config.json`
2. Run `npm run relay`
3. Enable relay in **Settings → Integrations**

Weekly reflections can be shared from **Reports → Share** via relay SMTP.

### mailto: fallback

If relay is off or SMTP fails, Hesia opens a `mailto:` URL with subject and body pre-filled. Your OS mail client handles delivery — no credentials in the app.

### Cloud transactional email

Providers such as SendGrid, Mailgun, or Amazon SES work **if** they expose SMTP and you can reach them from your network. This is optional:

- Add provider SMTP host/port/user/pass to `relay/config.json`
- Prefer regional or self-hosted mail where US SaaS is blocked
- Never paste API keys into the browser — only into local `config.json`

For development, [Mailpit](https://mailpit.axllent.org/) catches all outbound mail locally.

## Calendar

| Method | Module | Notes |
|--------|--------|-------|
| `.ics` download | `ics-builder.ts` | VEVENT with TZID or UTC Zulu |
| Google Calendar link | `google-calendar-link.ts` | UTC/Gregorian `dates=` param |
| Jalali display | `jalali-display.ts` | `jalaali-js` for Persian dates |

Calendar **storage** is not synced — Hesia generates one-off events/reminders you import or open externally.

## Locale (Dexie v7)

```ts
locale: {
  calendar: "jalali" | "gregorian",  // default gregorian
  direction: "rtl" | "ltr",        // default ltr
}
```

Configured in **Settings → Integrations**. Applies `dir` and `lang` on `<html>`.

## MCP (Dexie v8)

MCP server metadata is stored in `settings.mcpServers`. The relay:

- Spawns **stdio** MCP servers (`command` + `args`)
- Proxies **SSE/HTTP** endpoints
- Exposes built-in `hesia_*` tools

See [mcp.md](./mcp.md).

## Bot extension point (out of scope)

`src/types/integration-extensions.ts` reserves slots for future bots:

- `telegram`, `discord`, `matrix`, `slack`, `webhook`

No bot runtime ships in M5/M6. Downstream modules can register `IntegrationExtension` entries without schema migrations.

## Action executor (M4 hook)

`src/lib/actions/action-executor.ts` exposes:

- `send_email` — relay or mailto
- `add_calendar_event` — ICS + Google link

Future AI action runners (M4) call `executeAction()` with these types.