import type { AppSettings } from "@/types/settings";

export function migrateSettingsMcpV8(settings: AppSettings): AppSettings {
  return {
    ...settings,
    relay: settings.relay ?? {
      enabled: false,
      url: "http://127.0.0.1:8787",
    },
    mcpServers: settings.mcpServers ?? [],
  };
}