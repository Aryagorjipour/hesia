"use client";

import { createContext, useContext, useEffect, useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db/schema";
import { applyDocumentLocale, isRtl } from "@/lib/i18n/rtl";
import { DEFAULT_LOCALE_SETTINGS } from "@/lib/i18n/locale-defaults";
import type { LocaleSettings } from "@/types/settings";

interface LocaleContextValue {
  locale: LocaleSettings;
  isRtl: boolean;
}

const LocaleContext = createContext<LocaleContextValue>({
  locale: DEFAULT_LOCALE_SETTINGS,
  isRtl: true,
});

export function useLocale(): LocaleContextValue {
  return useContext(LocaleContext);
}

interface LocaleProviderProps {
  children: React.ReactNode;
}

export function LocaleProvider({ children }: LocaleProviderProps) {
  const settings = useLiveQuery(() => db.settings.get("default"));
  const locale = settings?.locale ?? DEFAULT_LOCALE_SETTINGS;

  const value = useMemo<LocaleContextValue>(
    () => ({
      locale,
      isRtl: isRtl(locale.direction),
    }),
    [locale],
  );

  useEffect(() => {
    applyDocumentLocale(locale);
  }, [locale]);

  return (
    <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  );
}