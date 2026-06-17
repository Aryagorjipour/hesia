import {
  format,
  parseISO,
  subDays,
  addDays,
  parse,
  isValid,
  previousSunday,
  previousMonday,
  previousTuesday,
  previousWednesday,
  previousThursday,
  previousFriday,
  previousSaturday,
} from "date-fns";

const PREVIOUS_DAY: Record<string, (date: Date) => Date> = {
  sunday: previousSunday,
  monday: previousMonday,
  tuesday: previousTuesday,
  wednesday: previousWednesday,
  thursday: previousThursday,
  friday: previousFriday,
  saturday: previousSaturday,
};

const DATE_FORMATS = [
  "yyyy-MM-dd",
  "MMM d yyyy",
  "MMM d",
  "EEE MMM d",
  "EEEE MMM d",
  "MMMM d yyyy",
  "MMMM d",
] as const;

export function parseBoardDateQuery(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const q = trimmed.toLowerCase();
  const today = new Date();

  if (q === "today") return format(today, "yyyy-MM-dd");
  if (q === "yesterday") return format(subDays(today, 1), "yyyy-MM-dd");
  if (q === "tomorrow") return format(addDays(today, 1), "yyyy-MM-dd");

  const daysAgoMatch = q.match(/^(\d+)\s*days?\s*ago$/);
  if (daysAgoMatch) {
    const n = parseInt(daysAgoMatch[1]!, 10);
    if (n >= 0 && n <= 3650) {
      return format(subDays(today, n), "yyyy-MM-dd");
    }
  }

  if (q.startsWith("last ")) {
    const dayName = q.slice(5).trim();
    const prev = PREVIOUS_DAY[dayName];
    if (prev) return format(prev(today), "yyyy-MM-dd");
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const d = parseISO(trimmed);
    if (isValid(d)) return trimmed;
  }

  for (const fmt of DATE_FORMATS) {
    const d = parse(trimmed, fmt, today);
    if (isValid(d)) return format(d, "yyyy-MM-dd");
  }

  return null;
}