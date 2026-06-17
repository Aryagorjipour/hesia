"use client";

import { useEffect } from "react";
import { useCommandPaletteStore } from "@/stores/command-palette-store";

export function useGlobalShortcuts() {
  const togglePalette = useCommandPaletteStore((s) => s.togglePalette);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        togglePalette();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [togglePalette]);
}