"use client";

import { useEffect, useState } from "react";
import { initializeDatabase } from "@/lib/db/init";
import { useSettingsStore } from "@/stores/settings-store";
import { HesiaLogo } from "@/components/brand/hesia-logo";
import type { AppSettings } from "@/types/settings";

interface DbProviderProps {
  children: React.ReactNode;
}

export function DbProvider({ children }: DbProviderProps) {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [error, setError] = useState<string | null>(null);
  const setZenPreset = useSettingsStore((s) => s.setZenPreset);

  useEffect(() => {
    initializeDatabase()
      .then((s) => {
        setSettings(s);
        setZenPreset(s.zenPreset);
      })
      .catch((err) => {
        console.error("Failed to initialize database:", err);
        setError("Could not open local storage. Please refresh.");
      });
  }, [setZenPreset]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center p-8">
        <p className="text-muted-foreground">{error}</p>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
        <HesiaLogo size={48} className="animate-pulse" priority />
        <p className="text-sm text-muted-foreground">Opening your space...</p>
      </div>
    );
  }

  return <>{children}</>;
}