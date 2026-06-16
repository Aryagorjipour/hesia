import {
  format,
  parseISO,
  addDays,
  subDays,
  differenceInCalendarDays,
  isToday,
  isTomorrow,
  isYesterday,
} from "date-fns";

export const READ_ONLY_PAST_DAYS = 3;

export type BoardDayMode = "today" | "future" | "recent_past" | "archived_past";

export function todayISO(): string {
  return format(new Date(), "yyyy-MM-dd");
}

/** Evening window when end-of-day reminders are shown (20:00–23:59). */
export function isEndOfDayWindow(now = new Date()): boolean {
  const hour = now.getHours();
  return hour >= 20 && hour <= 23;
}

/** Inbox reminder — today only, during the evening window. */
export function getInboxSharedBannerKey(boardDate: string): string | null {
  const today = todayISO();
  if (boardDate === today && isEndOfDayWindow()) {
    return `inbox-shared-${today}-evening`;
  }
  return null;
}

export function shouldShowInboxSharedBanner(
  boardDate: string,
  dismissedKeys: string[],
): boolean {
  const key = getInboxSharedBannerKey(boardDate);
  if (!key) return false;
  return !dismissedKeys.includes(key);
}

/** Carry-forward prompt: today only 20:00–23:59; past days anytime when viewing. */
export function shouldShowCarryForwardBar(boardDate: string): boolean {
  const mode = getBoardDayMode(boardDate);
  if (mode === "today") return isEndOfDayWindow();
  if (mode === "recent_past") return true;
  return false;
}

export function formatBoardDateISO(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

export function nextBoardDate(boardDate: string): string {
  return formatBoardDateISO(addDays(parseISO(boardDate), 1));
}

export function getBoardDayMode(
  boardDate: string,
  today: string = todayISO(),
): BoardDayMode {
  const diff = differenceInCalendarDays(parseISO(boardDate), parseISO(today));
  if (diff === 0) return "today";
  if (diff > 0) return "future";
  if (diff >= -READ_ONLY_PAST_DAYS) return "recent_past";
  return "archived_past";
}

export function getBoardDaysAround(
  center: string = todayISO(),
  pastCount = 7,
  futureCount = 7,
): string[] {
  const centerDate = parseISO(center);
  const days: string[] = [];
  for (let i = pastCount; i >= 1; i--) {
    days.push(formatBoardDateISO(subDays(centerDate, i)));
  }
  days.push(center);
  for (let i = 1; i <= futureCount; i++) {
    days.push(formatBoardDateISO(addDays(centerDate, i)));
  }
  return days;
}

export function formatBoardDayLabel(boardDate: string): string {
  const d = parseISO(boardDate);
  if (isToday(d)) return "Today";
  if (isTomorrow(d)) return "Tomorrow";
  if (isYesterday(d)) return "Yesterday";
  return format(d, "EEE, MMM d");
}

/** Compact label for day picker chips */
export function formatBoardDayShort(boardDate: string): string {
  const d = parseISO(boardDate);
  if (isToday(d)) return "Today";
  if (isTomorrow(d)) return "Tmrw";
  if (isYesterday(d)) return "Yday";
  return format(d, "d");
}

export function getBoardDayModeLabel(mode: BoardDayMode): string | null {
  switch (mode) {
    case "future":
      return "Plan";
    case "archived_past":
      return "Archive";
    case "recent_past":
      return "Past";
    default:
      return null;
  }
}

export interface BoardPermissions {
  mode: BoardDayMode;
  canAdd: (status: import("@/types/task").TaskStatus) => boolean;
  canDrag: boolean;
  canCarryForward: boolean;
  isReadOnly: boolean;
  canEditTask: (task: import("@/types/task").Task) => boolean;
}

export function getBoardPermissions(boardDate: string): BoardPermissions {
  const mode = getBoardDayMode(boardDate);

  const canAdd = (status: import("@/types/task").TaskStatus): boolean => {
    if (status === "inbox") return mode === "today";
    if (mode === "today") return true;
    if (mode === "future" && status === "todo") return true;
    return false;
  };

  const canEditTask = (task: import("@/types/task").Task): boolean => {
    if (mode === "archived_past" || mode === "recent_past") return false;
    if (mode === "today") return true;
    if (mode === "future" && task.status === "todo") return true;
    return false;
  };

  return {
    mode,
    canAdd,
    canDrag: mode === "today",
    canCarryForward: mode === "today" || mode === "recent_past",
    isReadOnly: mode === "archived_past",
    canEditTask,
  };
}