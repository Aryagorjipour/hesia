import { v4 as uuidv4 } from "uuid";
import { db } from "@/lib/db/schema";

export async function ensureDeviceId(): Promise<string> {
  const settings = await db.settings.get("default");
  if (!settings) throw new Error("Settings not found");

  const existing = settings.deviceSync?.deviceId;
  if (existing && existing.length >= 8) return existing;

  const deviceId = uuidv4().replace(/-/g, "").slice(0, 16);
  await db.settings.put({
    ...settings,
    deviceSync: {
      enabled: settings.deviceSync?.enabled ?? false,
      passwordVerifier: settings.deviceSync?.passwordVerifier,
      deviceLabel: settings.deviceSync?.deviceLabel,
      lastRelayUrl: settings.deviceSync?.lastRelayUrl,
      trustedDeviceIds: settings.deviceSync?.trustedDeviceIds,
      deviceId,
    },
  });
  return deviceId;
}