"use client";

import { useEffect } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db/schema";
import {
  shouldShowReflectionReminder,
  showReflectionNotification,
} from "@/lib/notifications/reflection-reminder";

export function useReflectionReminder() {
  const settings = useLiveQuery(() => db.settings.get("default"));

  useEffect(() => {
    if (!settings) return;

    function check() {
      if (!shouldShowReflectionReminder(settings)) return;
      showReflectionNotification();
    }

    check();
    const interval = window.setInterval(check, 60_000);
    return () => window.clearInterval(interval);
  }, [settings]);
}