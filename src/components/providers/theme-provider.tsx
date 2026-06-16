"use client";

import { useEffect } from "react";
import { useSettingsStore } from "@/stores/settings-store";
import { applyZenPreset, DEFAULT_ZEN_PRESET } from "@/lib/theme/presets";
import type { ZenPreset } from "@/types/settings";

interface ThemeProviderProps {
  children: React.ReactNode;
  initialPreset?: ZenPreset;
}

export function ThemeProvider({
  children,
  initialPreset = DEFAULT_ZEN_PRESET,
}: ThemeProviderProps) {
  const zenPreset = useSettingsStore((s) => s.zenPreset);
  const setZenPreset = useSettingsStore((s) => s.setZenPreset);

  useEffect(() => {
    if (!zenPreset) {
      setZenPreset(initialPreset);
    }
  }, [zenPreset, initialPreset, setZenPreset]);

  useEffect(() => {
    applyZenPreset(zenPreset || initialPreset);
  }, [zenPreset, initialPreset]);

  return <>{children}</>;
}