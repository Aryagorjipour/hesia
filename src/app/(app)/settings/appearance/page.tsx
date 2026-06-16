"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import type { WeekStartsOn } from "@/lib/utils/week-config";
import { useSettingsStore } from "@/stores/settings-store";
import { applyZenPreset } from "@/lib/theme/presets";
import { db } from "@/lib/db/schema";
import type { ZenPreset, PresetWorkspaceConfig } from "@/types/settings";
import { CalendarDays, LayoutTemplate, Palette, Sparkles } from "lucide-react";
import { SettingsPageHeader } from "@/components/settings/settings-page-header";
import { WeekStartPicker } from "@/features/settings/week-start-picker";
import { WorkspaceConfigForm } from "@/features/settings/workspace-config-form";
import { ZenPresetPicker } from "@/features/settings/zen-preset-picker";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { normalizeWeekStartsOn } from "@/lib/utils/week-config";
import { formatWeekStartISO } from "@/lib/stats/week-aggregator";
import { buildColumnNamesFromPresetConfig } from "@/lib/workspace/preset-config";

export default function AppearanceSettingsPage() {
  const zenPreset = useSettingsStore((s) => s.zenPreset);
  const setZenPreset = useSettingsStore((s) => s.setZenPreset);
  const settings = useLiveQuery(() => db.settings.get("default"));
  const setLastSelectedWeek = useSettingsStore((s) => s.setLastSelectedWeek);
  const weekStartsOn = normalizeWeekStartsOn(settings?.weekStartsOn);
  const [savingWeek, setSavingWeek] = useState(false);

  async function selectPreset(preset: ZenPreset) {
    const presetConfig = settings?.presetWorkspaceConfigs?.[preset];
    const columnNames = buildColumnNamesFromPresetConfig(presetConfig);

    setZenPreset(preset);
    applyZenPreset(preset);
    await db.settings.update("default", {
      zenPreset: preset,
      columnNames,
    });
  }

  async function savePresetWorkspace(
    preset: ZenPreset,
    config: PresetWorkspaceConfig,
  ) {
    const existing = settings?.presetWorkspaceConfigs ?? {};
    await db.settings.update("default", {
      presetWorkspaceConfigs: {
        ...existing,
        [preset]: config,
      },
      ...(zenPreset === preset
        ? { columnNames: buildColumnNamesFromPresetConfig(config) }
        : {}),
    });
  }

  async function selectWeekStart(value: WeekStartsOn) {
    setSavingWeek(true);
    try {
      await db.settings.update("default", { weekStartsOn: value });
      setLastSelectedWeek(formatWeekStartISO(new Date(), value));
    } finally {
      setSavingWeek(false);
    }
  }

  return (
    <div className="mx-auto flex h-full w-full max-w-3xl flex-col">
      <SettingsPageHeader
        title="Appearance"
        description="Themes, workspace layout, and calendar preferences."
      />

      <Tabs defaultValue="themes" className="flex min-h-0 flex-1 flex-col">
        <div className="shrink-0 border-b border-border px-4 py-3 sm:px-6 lg:px-8">
          <TabsList className="h-11 w-full justify-start overflow-x-auto sm:w-auto">
            <TabsTrigger value="themes" className="gap-1.5 px-4">
              <Palette className="h-3.5 w-3.5" />
              Themes
            </TabsTrigger>
            <TabsTrigger value="personalization" className="gap-1.5 px-4">
              <LayoutTemplate className="h-3.5 w-3.5" />
              Personalization
            </TabsTrigger>
            <TabsTrigger value="other" className="gap-1.5 px-4">
              <CalendarDays className="h-3.5 w-3.5" />
              Other
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <TabsContent value="themes" className="mt-0">
            <ZenPresetPicker
              selected={zenPreset}
              onSelect={(p) => void selectPreset(p)}
            />
          </TabsContent>

          <TabsContent value="personalization" className="mt-0 space-y-4">
            <div className="flex items-start gap-3 rounded-2xl border border-border/60 bg-card/40 p-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent/15">
                <Sparkles className="h-4 w-4 text-accent" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">
                  Workspace layout
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Customize columns and board subtitle for your active theme.
                  Each zen preset can keep its own saved layout.
                </p>
              </div>
            </div>
            <WorkspaceConfigForm
              preset={zenPreset}
              initialConfig={settings?.presetWorkspaceConfigs?.[zenPreset]}
              activeColumnNames={settings?.columnNames}
              onSave={savePresetWorkspace}
            />
          </TabsContent>

          <TabsContent value="other" className="mt-0">
            <section className="rounded-2xl border border-border/60 bg-card/40 p-4 sm:p-5">
              <div className="mb-4 flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-accent" aria-hidden />
                <div>
                  <h2 className="text-sm font-medium text-foreground">
                    Calendar
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    How weeks are grouped in reports and reflections
                  </p>
                </div>
              </div>
              <WeekStartPicker
                value={weekStartsOn}
                onChange={(v) => void selectWeekStart(v)}
                disabled={savingWeek}
              />
            </section>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}