import type { AppSettings } from "@/types/settings";
import {
  DEFAULT_LOCALE_SETTINGS,
  JALALI_RTL_LOCALE,
} from "@/lib/i18n/locale-defaults";

/**
 * Dexie v7 incorrectly defaulted every upgraded install to jalali + RTL.
 * Restore Gregorian LTR unless the user changed locale away from that pair.
 */
export function migrateSettingsLocaleV9(settings: AppSettings): AppSettings {
  const { locale } = settings;
  if (
    locale?.calendar === JALALI_RTL_LOCALE.calendar &&
    locale?.direction === JALALI_RTL_LOCALE.direction
  ) {
    return { ...settings, locale: DEFAULT_LOCALE_SETTINGS };
  }
  return settings;
}