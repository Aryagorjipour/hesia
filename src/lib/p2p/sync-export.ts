import { db } from "@/lib/db/schema";
import { toISO } from "@/lib/utils/dates";
import type { HesiaExportBundle } from "@/types/export";
import type { AppSettings } from "@/types/settings";
import type { SyncTombstone } from "@/types/p2p-sync";

export interface P2pExportBundle extends HesiaExportBundle {
  tombstones: SyncTombstone[];
}

function sanitizeSettings(settings: AppSettings): AppSettings {
  const { aiConfig, ...rest } = settings;
  return {
    ...rest,
    aiConfig: aiConfig
      ? { ...aiConfig, encryptedApiKey: undefined }
      : undefined,
  };
}

export async function collectP2pBundle(): Promise<P2pExportBundle> {
  const settings = await db.settings.get("default");
  if (!settings) throw new Error("Settings not found");

  return {
    version: settings.version ?? "0.1.0",
    exportedAt: toISO(new Date()),
    tasks: await db.tasks.toArray(),
    tags: await db.tags.toArray(),
    categories: await db.categories.toArray(),
    weeklyReports: await db.weeklyReports.toArray(),
    chatSessions: await db.chatSessions.toArray(),
    chatMessages: await db.chatMessages.toArray(),
    userMemory: await db.userMemory.toArray(),
    settings: sanitizeSettings(settings),
    tombstones: await db.syncTombstones.toArray(),
  };
}

export async function getP2pPreview() {
  const [tasks, tags, categories] = await Promise.all([
    db.tasks.count(),
    db.tags.count(),
    db.categories.count(),
  ]);
  return { tasks, tags, categories };
}

export function chunkString(value: string, size = 48_000): string[] {
  const chunks: string[] = [];
  for (let i = 0; i < value.length; i += size) {
    chunks.push(value.slice(i, i + size));
  }
  return chunks.length > 0 ? chunks : [""];
}

export async function sha256Hex(value: string): Promise<string> {
  const hash = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}