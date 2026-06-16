import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { TaskStatus } from "@/types/task";
import { todayISO } from "@/lib/utils/board-dates";

export type ViewMode = "board" | "list";
export type PlannedFilter = "all" | "planned" | "unplanned";

interface BoardState {
  viewMode: ViewMode;
  searchQuery: string;
  selectedTags: string[];
  selectedCategory: string | null;
  plannedFilter: PlannedFilter;
  statusFilter: TaskStatus | "all";
  dateFrom: string | null;
  dateTo: string | null;
  selectedTaskId: string | null;
  selectedBoardDate: string;
  dismissedInboxBannerKeys: string[];
  setSelectedBoardDate: (date: string) => void;
  dismissInboxBanner: (key: string) => void;
  setViewMode: (mode: ViewMode) => void;
  setSearchQuery: (query: string) => void;
  toggleTag: (tag: string) => void;
  clearTags: () => void;
  setSelectedCategory: (category: string | null) => void;
  setPlannedFilter: (filter: PlannedFilter) => void;
  setStatusFilter: (status: TaskStatus | "all") => void;
  setDateFrom: (date: string | null) => void;
  setDateTo: (date: string | null) => void;
  setSelectedTaskId: (id: string | null) => void;
  clearFilters: () => void;
  hasActiveFilters: () => boolean;
}

export const useBoardStore = create<BoardState>()(
  persist(
    (set, get) => ({
  viewMode: "board",
  searchQuery: "",
  selectedTags: [],
  selectedCategory: null,
  plannedFilter: "all",
  statusFilter: "all",
  dateFrom: null,
  dateTo: null,
  selectedTaskId: null,
  selectedBoardDate: todayISO(),
  dismissedInboxBannerKeys: [],
  setSelectedBoardDate: (date) => set({ selectedBoardDate: date }),
  dismissInboxBanner: (key) =>
    set((s) => ({
      dismissedInboxBannerKeys: s.dismissedInboxBannerKeys.includes(key)
        ? s.dismissedInboxBannerKeys
        : [...s.dismissedInboxBannerKeys, key],
    })),
  setViewMode: (mode) => set({ viewMode: mode }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  toggleTag: (tag) =>
    set((s) => ({
      selectedTags: s.selectedTags.includes(tag)
        ? s.selectedTags.filter((t) => t !== tag)
        : [...s.selectedTags, tag],
    })),
  clearTags: () => set({ selectedTags: [] }),
  setSelectedCategory: (category) => set({ selectedCategory: category }),
  setPlannedFilter: (filter) => set({ plannedFilter: filter }),
  setStatusFilter: (status) => set({ statusFilter: status }),
  setDateFrom: (date) => set({ dateFrom: date }),
  setDateTo: (date) => set({ dateTo: date }),
  setSelectedTaskId: (id) => set({ selectedTaskId: id }),
  clearFilters: () =>
    set({
      searchQuery: "",
      selectedTags: [],
      selectedCategory: null,
      plannedFilter: "all",
      statusFilter: "all",
      dateFrom: null,
      dateTo: null,
    }),
  hasActiveFilters: () => {
    const s = get();
    return (
      s.searchQuery.length > 0 ||
      s.selectedTags.length > 0 ||
      s.selectedCategory !== null ||
      s.plannedFilter !== "all" ||
      s.statusFilter !== "all" ||
      s.dateFrom !== null ||
      s.dateTo !== null
    );
  },
}),
    {
      name: "hesia-board-ui",
      partialize: (state) => ({
        viewMode: state.viewMode,
        selectedBoardDate: state.selectedBoardDate,
        dismissedInboxBannerKeys: state.dismissedInboxBannerKeys,
      }),
    },
  ),
);