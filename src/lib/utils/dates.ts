import {
  format,
  startOfWeek,
  endOfWeek,
  subWeeks,
  parseISO,
  isWithinInterval,
} from "date-fns";
import { DEFAULT_WEEK_STARTS_ON, type WeekStartsOn } from "./week-config";

export function toISO(date: Date): string {
  return date.toISOString();
}

export function getWeekBounds(
  date: Date = new Date(),
  weekStartsOn: WeekStartsOn = DEFAULT_WEEK_STARTS_ON,
) {
  const start = startOfWeek(date, { weekStartsOn });
  const end = endOfWeek(date, { weekStartsOn });
  return { start, end };
}

export function formatWeekLabel(
  date: Date,
  weekStartsOn: WeekStartsOn = DEFAULT_WEEK_STARTS_ON,
): string {
  const { start, end } = getWeekBounds(date, weekStartsOn);
  return `${format(start, "MMM d")} – ${format(end, "MMM d, yyyy")}`;
}

export function getRecentWeeks(count: number): Date[] {
  const weeks: Date[] = [];
  const now = new Date();
  for (let i = 0; i < count; i++) {
    weeks.push(subWeeks(now, i));
  }
  return weeks;
}

export function isDateInWeek(
  isoDate: string,
  weekStart: Date,
  weekEnd: Date,
): boolean {
  const date = parseISO(isoDate);
  return isWithinInterval(date, { start: weekStart, end: weekEnd });
}