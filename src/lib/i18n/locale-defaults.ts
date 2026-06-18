import type { LocaleSettings } from "@/types/settings";

/** Default locale for new installs — Gregorian calendar + LTR (English UI). */
export const DEFAULT_LOCALE_SETTINGS: LocaleSettings = {
  calendar: "gregorian",
  direction: "ltr",
};

/** Opt-in preset for Persian / Jalali (Settings → Integrations). */
export const JALALI_RTL_LOCALE: LocaleSettings = {
  calendar: "jalali",
  direction: "rtl",
};

/** @deprecated Use DEFAULT_LOCALE_SETTINGS */
export const GREGORIAN_LTR_LOCALE: LocaleSettings = DEFAULT_LOCALE_SETTINGS;