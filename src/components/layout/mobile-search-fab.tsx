"use client";

import { Search } from "lucide-react";
import { useCommandPaletteStore } from "@/stores/command-palette-store";

export function MobileSearchFab() {
  const openPalette = useCommandPaletteStore((s) => s.openPalette);

  return (
    <button
      type="button"
      onClick={openPalette}
      className="fixed bottom-[4.75rem] right-4 z-40 flex h-12 w-12 items-center justify-center rounded-2xl border border-border/60 bg-card/95 text-muted-foreground shadow-lg backdrop-blur-md transition-colors hover:bg-muted/50 hover:text-foreground lg:hidden"
      aria-label="Search"
    >
      <Search className="h-5 w-5" strokeWidth={1.5} />
    </button>
  );
}