"use client";

import { useEffect } from "react";

interface ShortcutHandlers {
  onQuickCapture?: () => void;
  onSearch?: () => void;
  onEscape?: () => void;
}

export function useKeyboardShortcuts(handlers: ShortcutHandlers, enabled = true) {
  useEffect(() => {
    if (!enabled) return;

    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      const isTyping =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable;

      if (e.key === "Escape" && handlers.onEscape) {
        handlers.onEscape();
        return;
      }

      if (isTyping) return;

      if (e.key === "n" && !e.metaKey && !e.ctrlKey && handlers.onQuickCapture) {
        e.preventDefault();
        handlers.onQuickCapture();
      }

      if (e.key === "/" && handlers.onSearch) {
        e.preventDefault();
        handlers.onSearch();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handlers, enabled]);
}