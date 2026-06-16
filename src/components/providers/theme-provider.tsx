"use client";

import { useEffect } from "react";
import { useSettingsStore } from "@/stores/settings-store";
import { applyZenPreset } from "@/lib/theme/presets";
import type { ZenPreset } from "@/types/settings";

interface ThemeProviderProps {
  children: React.ReactNode;
  initialPreset?: ZenPreset;
}

export function ThemeProvider({
  children,
  initialPreset = "calm-teal",
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