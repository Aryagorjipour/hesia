import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ZenPreset } from "@/types/settings";

interface SettingsUIState {
  zenPreset: ZenPreset;
  sidebarCollapsed: boolean;
  lastSelectedWeek: string | null;
  setZenPreset: (preset: ZenPreset) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setLastSelectedWeek: (week: string) => void;
}

export const useSettingsStore = create<SettingsUIState>()(
  persist(
    (set) => ({
      zenPreset: "calm-teal",
      sidebarCollapsed: false,
      lastSelectedWeek: null,
      setZenPreset: (preset) => set({ zenPreset: preset }),
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
      setLastSelectedWeek: (week) => set({ lastSelectedWeek: week }),
    }),
    {
      name: "hesia-settings-ui",
      partialize: (state) => ({
        zenPreset: state.zenPreset,
        sidebarCollapsed: state.sidebarCollapsed,
        lastSelectedWeek: state.lastSelectedWeek,
      }),
    },
  ),
);