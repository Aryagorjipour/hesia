"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db/schema";
import { DEFAULT_LOCALE_SETTINGS } from "@/lib/i18n/locale-defaults";
import type { LocaleSettings } from "@/types/settings";

export function useLocaleSettings(): LocaleSettings {
  const settings = useLiveQuery(() => db.settings.get("default"));
  return settings?.locale ?? DEFAULT_LOCALE_SETTINGS;
}