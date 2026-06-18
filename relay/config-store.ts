import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { SmtpConfig } from "./smtp";
import { isSmtpConfigured } from "./smtp";

export interface RelayMcpServerConfig {
  id: string;
  name: string;
  transport: "stdio" | "sse" | "http";
  command?: string;
  args?: string[];
  url?: string;
  enabled?: boolean;
}

export interface RelayConfig {
  host: string;
  port: number;
  smtp?: SmtpConfig;
  mcpServers?: RelayMcpServerConfig[];
}

export interface PublicSmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  from: string;
  passConfigured: boolean;
}

const CONFIG_PATH = resolve(import.meta.dir, "config.json");

const DEFAULT_CONFIG: RelayConfig = {
  host: "127.0.0.1",
  port: 8787,
  mcpServers: [],
};

let cached: RelayConfig = { ...DEFAULT_CONFIG };

export function getRelayConfig(): RelayConfig {
  return cached;
}

export function getSmtpConfig(): SmtpConfig | undefined {
  return cached.smtp;
}

export function isRelaySmtpConfigured(): boolean {
  return isSmtpConfigured(cached.smtp);
}

export function toPublicSmtpConfig(
  smtp: SmtpConfig | undefined,
): PublicSmtpConfig | null {
  if (!smtp) return null;
  return {
    host: smtp.host,
    port: smtp.port,
    secure: smtp.secure ?? smtp.port === 465,
    user: smtp.user,
    from: smtp.from,
    passConfigured: Boolean(smtp.pass),
  };
}

export async function loadRelayConfig(): Promise<RelayConfig> {
  try {
    const raw = await readFile(CONFIG_PATH, "utf8");
    cached = { ...DEFAULT_CONFIG, ...(JSON.parse(raw) as RelayConfig) };
  } catch {
    cached = { ...DEFAULT_CONFIG };
  }
  return cached;
}

export async function persistRelayConfig(): Promise<void> {
  await writeFile(CONFIG_PATH, `${JSON.stringify(cached, null, 2)}\n`, "utf8");
}

export async function updateSmtpConfig(
  input: Partial<SmtpConfig> & Pick<SmtpConfig, "host" | "port" | "user" | "from">,
): Promise<SmtpConfig> {
  const existing = cached.smtp;
  const next: SmtpConfig = {
    host: input.host.trim(),
    port: input.port,
    secure: input.secure ?? input.port === 465,
    user: input.user.trim(),
    pass: input.pass?.trim() ? input.pass : (existing?.pass ?? ""),
    from: input.from.trim(),
  };
  cached = { ...cached, smtp: next };
  await persistRelayConfig();
  return next;
}