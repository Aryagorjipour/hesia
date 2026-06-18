import type { LocaleSettings } from "@/types/settings";

export type TextDirection = LocaleSettings["direction"];

/** Whether the given direction is right-to-left. */
export function isRtl(direction: TextDirection): boolean {
  return direction === "rtl";
}

/** HTML `lang` attribute derived from calendar system. */
export function calendarToLang(calendar: LocaleSettings["calendar"]): string {
  return calendar === "jalali" ? "fa" : "en";
}

/** Apply `dir` and `lang` on the document root (client only). */
export function applyDocumentLocale(locale: LocaleSettings): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.lang = calendarToLang(locale.calendar);
  root.dir = locale.direction;
  root.dataset.calendar = locale.calendar;
  root.dataset.direction = locale.direction;
}