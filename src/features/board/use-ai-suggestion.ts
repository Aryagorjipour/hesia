"use client";

import { useCallback, useState } from "react";
import { toast } from "@/lib/toast";
import { useOnlineStatus } from "@/lib/hooks/use-online-status";
import type { AiSuggestionPanelState } from "./ai-suggestions-panel";

export function useAiSuggestion<T>({
  aiConfigured,
  fetchSuggestion,
  onAccept,
}: {
  aiConfigured: boolean;
  fetchSuggestion: () => Promise<T>;
  onAccept: (value: T) => void;
}) {
  const isOnline = useOnlineStatus();
  const [suggestion, setSuggestion] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const state: AiSuggestionPanelState = loading
    ? "loading"
    : error
      ? "error"
      : suggestion
        ? "preview"
        : "idle";

  const suggest = useCallback(async () => {
    if (!aiConfigured) return;
    if (!isOnline) {
      toast.warning({
        title: "You're offline",
        description: "AI needs an internet connection.",
      });
      return;
    }

    setLoading(true);
    setError(null);
    setSuggestion(null);
    try {
      const result = await fetchSuggestion();
      setSuggestion(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Suggestion failed");
    } finally {
      setLoading(false);
    }
  }, [aiConfigured, fetchSuggestion, isOnline]);

  const accept = useCallback(() => {
    if (suggestion) onAccept(suggestion);
    setSuggestion(null);
    setError(null);
  }, [onAccept, suggestion]);

  const reject = useCallback(() => {
    setSuggestion(null);
    setError(null);
  }, []);

  return {
    suggestion,
    error,
    state,
    isOnline,
    suggest,
    accept,
    reject,
  };
}