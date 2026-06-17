import { db } from "./schema";
import type { AppSettings } from "@/types/settings";
import { v4 as uuidv4 } from "uuid";
import { toISO } from "@/lib/utils/dates";

const DEFAULT_SETTINGS: AppSettings = {
  id: "default",
  onboardingComplete: false,
  profile: {},
  zenPreset: "sage-dune-dark",
  weekStartsOn: 1,
  theme: "dark",
  notifications: {
    weeklyReflection: false,
    reflectionDay: 0,
    reflectionHour: 18,
  },
  version: "0.1.0",
};

export async function ensureDefaultSettings(): Promise<AppSettings> {
  const existing = await db.settings.get("default");
  if (existing) return existing;

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