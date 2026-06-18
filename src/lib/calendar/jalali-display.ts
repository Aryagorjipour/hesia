import jalaali from "jalaali-js";
import { format } from "date-fns";
import type { LocaleSettings } from "@/types/settings";

const JALALI_MONTHS = [
  "فروردین",
  "اردیبهشت",
  "خرداد",
  "تیر",
  "مرداد",
  "شهریور",
  "مهر",
  "آبان",
  "آذر",
  "دی",
  "بهمن",
  "اسفند",
] as const;

const JALALI_WEEKDAYS = [
  "یکشنبه",
  "دوشنبه",
  "سه‌شنبه",
  "چهارشنبه",
  "پنجشنبه",
  "جمعه",
  "شنبه",
] as const;

export interface JalaliDateParts {
  jy: number;
  jm: number;
  jd: number;
  weekday: number;
}

export function toJalaliParts(date: Date): JalaliDateParts {
  const { jy, jm, jd } = jalaali.toJalaali(
    date.getFullYear(),
    date.getMonth() + 1,
    date.getDate(),
  );
  return { jy, jm, jd, weekday: date.getDay() };
}

export function formatJalaliDate(
  date: Date,
  style: "short" | "long" = "long",
): string {
  const { jy, jm, jd, weekday } = toJalaliParts(date);
  const month = JALALI_MONTHS[jm - 1] ?? String(jm);
  const dayName = JALALI_WEEKDAYS[weekday] ?? "";

  if (style === "short") {
    return `${jy}/${String(jm).padStart(2, "0")}/${String(jd).padStart(2, "0")}`;
  }

  return `${dayName} ${jd} ${month} ${jy}`;
}

export function formatGregorianDate(
  date: Date,
  pattern = "MMM d, yyyy",
): string {
  return format(date, pattern);
}

export function formatDisplayDate(
  date: Date,
  locale: Pick<LocaleSettings, "calendar">,
  style: "short" | "long" = "long",
): string {
  if (locale.calendar === "jalali") {
    return formatJalaliDate(date, style);
  }
  return formatGregorianDate(
    date,
    style === "short" ? "yyyy-MM-dd" : "EEE, MMM d, yyyy",
  );
}

export function formatWeekRangeDisplay(
  weekStart: Date,
  weekEnd: Date,
  locale: Pick<LocaleSettings, "calendar">,
): string {
  if (locale.calendar === "jalali") {
    return `${formatJalaliDate(weekStart, "short")} – ${formatJalaliDate(weekEnd, "short")}`;
  }
  return `${formatGregorianDate(weekStart, "MMM d")} – ${formatGregorianDate(weekEnd, "MMM d, yyyy")}`;
}