import { db } from "./schema";
import type { AppSettings } from "@/types/settings";
import { migrateSettingsAi } from "@/lib/ai/migrate-ai-config";
import { DEFAULT_LOCALE_SETTINGS } from "@/lib/i18n/locale-defaults";
import { v4 as uuidv4 } from "uuid";
import { toISO } from "@/lib/utils/dates";

const DEFAULT_SETTINGS: AppSettings = {
  id: "default",
  onboardingComplete: false,
  profile: {},
  zenPreset: "sage-dune-dark",
  weekStartsOn: 1,
  locale: DEFAULT_LOCALE_SETTINGS,
  theme: "dark",
  notifications: {
    weeklyReflection: false,
    reflectionDay: 0,
    reflectionHour: 18,
  },
  relay: {
    enabled: false,
    url: "http://127.0.0.1:8787",
  },
  mcpServers: [],
  version: "0.1.0",
};

export async function ensureDefaultSettings(): Promise<AppSettings> {
  const existing = await db.settings.get("default");
  if (existing) {
    if (!existing.aiProfiles?.length && existing.aiConfig) {
      const migrated = migrateSettingsAi(existing);
      await db.settings.put(migrated);
      return migrated;
    }
    return existing;
  }

  await db.settings.put(DEFAULT_SETTINGS);
  return DEFAULT_SETTINGS;
}

/** @deprecated Use ensureDefaultChatSessions */
export async function ensureMainChatSession(): Promise<string> {
  const { defaultSessionId } = await ensureDefaultChatSessions();
  return defaultSessionId;
}

export async function ensureDefaultChatSessions(): Promise<{
  defaultSessionId: string;
  sessionIds: string[];
}> {
  const sessions = await db.chatSessions.orderBy("updatedAt").reverse().toArray();

  if (sessions.length > 0) {
    return {
      defaultSessionId: sessions[0]!.id,
      sessionIds: sessions.map((s) => s.id),
    };
  }

  const now = toISO(new Date());
  const id = uuidv4();
  await db.chatSessions.put({
    id,
    title: "Main",
    createdAt: now,
    updatedAt: now,
  });
  return { defaultSessionId: id, sessionIds: [id] };
}

export async function initializeDatabase(): Promise<AppSettings> {
  await db.open();
  const settings = await ensureDefaultSettings();
  await ensureMainChatSession();
  return settings;
}