import { create } from "zustand";

interface CommandPaletteState {
  open: boolean;
  query: string;
  activeIndex: number;
  openPalette: () => void;
  closePalette: () => void;
  togglePalette: () => void;
  setQuery: (query: string) => void;
  setActiveIndex: (index: number) => void;
}

export const useCommandPaletteStore = create<CommandPaletteState>((set) => ({
  open: false,
  query: "",
  activeIndex: 0,
  openPalette: () => set({ open: true, query: "", activeIndex: 0 }),
  closePalette: () => set({ open: false, query: "", activeIndex: 0 }),
  togglePalette: () =>
    set((s) =>
      s.open
        ? { open: false, query: "", activeIndex: 0 }
        : { open: true, query: "", activeIndex: 0 },
    ),
  setQuery: (query) => set({ query, activeIndex: 0 }),
  setActiveIndex: (activeIndex) => set({ activeIndex }),
}));