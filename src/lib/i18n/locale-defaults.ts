import type { LocaleSettings } from "@/types/settings";

/** Default locale for new installs — jalali calendar + RTL (Persian-first). */
export const DEFAULT_LOCALE_SETTINGS: LocaleSettings = {
  calendar: "jalali",
  direction: "rtl",
};

/** Defaults when switching to Gregorian / LTR display. */
export const GREGORIAN_LTR_LOCALE: LocaleSettings = {
  calendar: "gregorian",
  direction: "ltr",
};

export function localeForCalendar(
  calendar: LocaleSettings["calendar"],
): LocaleSettings {
  return calendar === "jalali"
    ? { calendar: "jalali", direction: "rtl" }
    : { calendar: "gregorian", direction: "ltr" };
}