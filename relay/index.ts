import { Hono } from "hono";
import { cors } from "hono/cors";
import {
  callBridgeTool,
  listAllTools,
  shutdownBridge,
} from "./mcp-bridge";
import { isSmtpConfigured, sendMail, resetSmtpTransporter } from "./smtp";
import {
  getRelayConfig,
  getSmtpConfig,
  isRelaySmtpConfigured,
  loadRelayConfig,
  toPublicSmtpConfig,
  updateSmtpConfig,
} from "./config-store";
import { verifySmtpConnection } from "./smtp-test";

await loadRelayConfig();

const config = getRelayConfig();
const host = config.host ?? "127.0.0.1";
const port = config.port ?? 8787;
const mcpServers = config.mcpServers ?? [];

if (host !== "127.0.0.1" && host !== "localhost") {
  console.error(
    `[hesia-relay] Refusing to bind to ${host}. Relay must bind localhost only.`,
  );
  process.exit(1);
}

const app = new Hono();

app.use(
  "*",
  cors({
    origin: (origin) => {
      if (!origin) return "*";
      try {
        const url = new URL(origin);
        if (url.hostname === "localhost" || url.hostname === "127.0.0.1") {
          return origin;
        }
      } catch {
        return null;
      }
      return null;
    },
  }),
);

app.get("/health", (c) =>
  c.json({
    ok: true,
    version: "0.1.0",
    smtpConfigured: isRelaySmtpConfigured(),
    mcpBridgeReady: true,
    mcpServerCount: mcpServers.filter((s) => s.enabled !== false).length,
  }),
);

app.get("/smtp/config", (c) => {
  const publicConfig = toPublicSmtpConfig(getSmtpConfig());
  return c.json({
    ok: true,
    configured: isRelaySmtpConfigured(),
    config: publicConfig,
  });
});

app.put("/smtp/config", async (c) => {
  const body = await c.req.json<{
    host?: string;
    port?: number;
    secure?: boolean;
    user?: string;
    pass?: string;
    from?: string;
  }>();

  if (!body.host?.trim() || !body.user?.trim() || !body.from?.trim()) {
    return c.json(
      { ok: false, error: "host, user, and from are required" },
      400,
    );
  }

  const port = Number(body.port);
  if (!Number.isFinite(port) || port < 1 || port > 65535) {
    return c.json({ ok: false, error: "port must be between 1 and 65535" }, 400);
  }

  const existing = getSmtpConfig();
  if (!body.pass?.trim() && !existing?.pass) {
    return c.json(
      { ok: false, error: "app password is required for first-time setup" },
      400,
    );
  }

  try {
    const saved = await updateSmtpConfig({
      host: body.host,
      port,
      secure: body.secure,
      user: body.user,
      pass: body.pass,
      from: body.from,
    });
    resetSmtpTransporter();
    return c.json({
      ok: true,
      configured: isSmtpConfigured(saved),
      config: toPublicSmtpConfig(saved),
    });
  } catch (err) {
    return c.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "Could not save SMTP config",
      },
      500,
    );
  }
});

app.post("/smtp/test", async (c) => {
  const smtp = getSmtpConfig();
  if (!isSmtpConfigured(smtp) || !smtp) {
    return c.json(
      { ok: false, error: "Save your email settings before testing" },
      503,
    );
  }

  const result = await verifySmtpConnection(smtp);
  if (!result.ok) {
    return c.json({ ok: false, error: result.error }, 400);
  }
  return c.json({ ok: true, message: "SMTP connection successful" });
});

app.post("/email/send", async (c) => {
  const smtp = getSmtpConfig();
  if (!isSmtpConfigured(smtp) || !smtp) {
    return c.json(
      {
        ok: false,
        error: "Email not set up — open Settings → Integrations and save SMTP",
      },
      503,
    );
  }

  const body = await c.req.json<{
    to?: string;
    subject?: string;
    text?: string;
    html?: string;
  }>();

  if (!body.to || !body.subject || !body.text) {
    return c.json({ ok: false, error: "to, subject, and text are required" }, 400);
  }

  try {
    const result = await sendMail(smtp, {
      to: body.to,
      subject: body.subject,
      text: body.text,
      html: body.html,
    });
    return c.json({ ok: true, messageId: result.messageId });
  } catch (err) {
    return c.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "SMTP send failed",
      },
      500,
    );
  }
});

app.get("/mcp/tools", async (c) => {
  const tools = await listAllTools(mcpServers);
  return c.json({ tools });
});

app.post("/mcp/call", async (c) => {
  const body = await c.req.json<{
    serverId?: string;
    name?: string;
    arguments?: Record<string, unknown>;
  }>();

  if (!body.serverId || !body.name) {
    return c.json({ ok: false, error: "serverId and name are required" }, 400);
  }

  const result = await callBridgeTool(
    mcpServers,
    getSmtpConfig(),
    body.serverId,
    body.name,
    body.arguments ?? {},
  );
  return c.json(result);
});

console.log(
  `[hesia-relay] Listening on http://${host}:${port} (localhost only)`,
);
console.log(
  `[hesia-relay] SMTP: ${isRelaySmtpConfigured() ? "configured" : "waiting for setup in Hesía Settings"}`,
);

const server = Bun.serve({
  hostname: host,
  port,
  fetch: app.fetch,
});

process.on("SIGINT", async () => {
  await shutdownBridge();
  server.stop();
  process.exit(0);
});