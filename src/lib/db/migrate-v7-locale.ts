import type { AppSettings } from "@/types/settings";
import { DEFAULT_LOCALE_SETTINGS } from "@/lib/i18n/locale-defaults";

export function migrateSettingsLocaleV7(settings: AppSettings): AppSettings {
  if (settings.locale) return settings;
  return {
    ...settings,
    locale: DEFAULT_LOCALE_SETTINGS,
  };
}