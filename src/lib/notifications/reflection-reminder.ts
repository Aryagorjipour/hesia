import { getDay, getHours } from "date-fns";
import type { AppSettings } from "@/types/settings";
import { formatWeekStartISO } from "@/lib/stats/week-aggregator";
import { normalizeWeekStartsOn } from "@/lib/utils/week-config";

const NOTIFIED_KEY = "hesia-reflection-notified-week";

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "denied";
  }
  if (Notification.permission === "granted") return "granted";
  if (Notification.permission === "denied") return "denied";
  return Notification.requestPermission();
}

export function shouldShowReflectionReminder(
  settings: AppSettings | undefined,
  now = new Date(),
): boolean {
  if (!settings?.notifications?.weeklyReflection) return false;

  const day = getDay(now);
  const hour = getHours(now);
  const targetDay = settings.notifications.reflectionDay;
  const targetHour = settings.notifications.reflectionHour;

  if (day !== targetDay || hour !== targetHour) return false;

  const weekStartsOn = normalizeWeekStartsOn(settings.weekStartsOn);
  const weekKey = formatWeekStartISO(now, weekStartsOn);
  if (typeof sessionStorage !== "undefined") {
    if (sessionStorage.getItem(NOTIFIED_KEY) === weekKey) return false;
  }

  return true;
}

export function markReflectionNotified(
  now = new Date(),
  weekStartsOn = normalizeWeekStartsOn(),
): void {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.setItem(NOTIFIED_KEY, formatWeekStartISO(now, weekStartsOn));
}

export function showReflectionNotification(): void {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;

  const notification = new Notification("Hesia — weekly reflection", {
    body: "A gentle nudge to review your week and generate a reflection.",
    icon: "/icon-192.png",
    tag: "hesia-weekly-reflection",
  });

  notification.onclick = () => {
    window.focus();
    window.location.href = "/reports";
    notification.close();
  };

  markReflectionNotified();
}