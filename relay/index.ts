import { Hono } from "hono";
import { cors } from "hono/cors";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  callBridgeTool,
  listAllTools,
  shutdownBridge,
  type RelayMcpServerConfig,
} from "./mcp-bridge";
import { isSmtpConfigured, sendMail, type SmtpConfig } from "./smtp";

interface RelayConfig {
  host: string;
  port: number;
  smtp?: SmtpConfig;
  mcpServers?: RelayMcpServerConfig[];
}

const CONFIG_PATH = resolve(import.meta.dir, "config.json");

async function loadConfig(): Promise<RelayConfig> {
  try {
    const raw = await readFile(CONFIG_PATH, "utf8");
    return JSON.parse(raw) as RelayConfig;
  } catch {
    console.warn(
      "[hesia-relay] config.json not found — copy config.example.json and edit SMTP settings.",
    );
    return { host: "127.0.0.1", port: 8787, mcpServers: [] };
  }
}

const config = await loadConfig();
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
    smtpConfigured: isSmtpConfigured(config.smtp),
    mcpBridgeReady: true,
    mcpServerCount: mcpServers.filter((s) => s.enabled !== false).length,
  }),
);

app.post("/email/send", async (c) => {
  if (!isSmtpConfigured(config.smtp) || !config.smtp) {
    return c.json(
      { ok: false, error: "SMTP not configured — edit relay/config.json" },
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
    const result = await sendMail(config.smtp, {
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
    config.smtp,
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
  `[hesia-relay] SMTP: ${isSmtpConfigured(config.smtp) ? "configured" : "not configured"}`,
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