import type { AppSettings } from "@/types/settings";

export function migrateSettingsLocaleV7(settings: AppSettings): AppSettings {
  if (settings.locale) return settings;
  return {
    ...settings,
    locale: {
      calendar: "jalali",
      direction: "rtl",
    },
  };
}