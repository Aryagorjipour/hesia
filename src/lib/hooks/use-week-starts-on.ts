"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db/schema";
import {
  normalizeWeekStartsOn,
  type WeekStartsOn,
} from "@/lib/utils/week-config";

export function useWeekStartsOn(): WeekStartsOn {
  const settings = useLiveQuery(() => db.settings.get("default"));
  return normalizeWeekStartsOn(settings?.weekStartsOn);
}