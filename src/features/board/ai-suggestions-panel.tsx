"use client";

import Link from "next/link";
import { Check, Loader2, Settings, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export type AiSuggestionPanelState = "idle" | "loading" | "preview" | "error";

interface AiSuggestionsPanelProps {
  label: string;
  description?: string;
  aiConfigured: boolean;
  featureName: string;
  state: AiSuggestionPanelState;
  error?: string | null;
  isOnline?: boolean;
  disabled?: boolean;
  onSuggest: () => void;
  onAccept: () => void;
  onReject: () => void;
  preview?: React.ReactNode;
  showTrigger?: boolean;
}

export function AiSuggestTrigger({
  label,
  aiConfigured,
  loading,
  disabled,
  onSuggest,
}: {
  label: string;
  aiConfigured: boolean;
  loading?: boolean;
  disabled?: boolean;
  onSuggest: () => void;
}) {
  if (!aiConfigured) return null;

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="h-7 gap-1 px-2 text-[11px] text-accent hover:text-accent"
      onClick={onSuggest}
      disabled={disabled || loading}
    >
      {loading ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : (
        <Sparkles className="h-3 w-3" />
      )}
      {loading ? "Suggesting…" : label}
    </Button>
  );
}

export function AiSuggestionFeedback({
  description,
  featureName,
  state,
  error,
  isOnline = true,
  onAccept,
  onReject,
  preview,
}: {
  description?: string;
  featureName: string;
  state: AiSuggestionPanelState;
  error?: string | null;
  isOnline?: boolean;
  onAccept: () => void;
  onReject: () => void;
  preview?: React.ReactNode;
}) {
  if (state === "idle" && isOnline) return null;

  return (
    <div className="space-y-2">
      {!isOnline && state === "idle" && (
        <p className="rounded-xl bg-amber-500/10 px-3 py-2 text-[11px] text-amber-200/90">
          Offline — connect to use {featureName.toLowerCase()}.
        </p>
      )}

      {state === "loading" && (
        <div className="flex items-center gap-2 rounded-2xl border border-accent/25 bg-accent/5 px-3 py-2.5 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-accent" />
          Getting {featureName.toLowerCase()}…
        </div>
      )}

      {state === "error" && error && (
        <div className="rounded-2xl border border-red-500/25 bg-red-500/5 px-3 py-2.5 text-xs text-red-300/90">
          {error}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="mt-2 h-7 px-2 text-[11px]"
            onClick={onReject}
          >
            Dismiss
          </Button>
        </div>
      )}

      {state === "preview" && preview && (
        <div className="space-y-3 rounded-2xl border border-accent/25 bg-accent/5 p-3 sm:p-4">
          {description && (
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              {description}
            </p>
          )}
          <div className="text-sm">{preview}</div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              className="gap-1.5"
              onClick={onAccept}
            >
              <Check className="h-3.5 w-3.5" />
              Accept
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="gap-1.5"
              onClick={onReject}
            >
              <X className="h-3.5 w-3.5" />
              Reject
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export function AiSuggestionsPanel({
  label,
  description,
  aiConfigured,
  featureName,
  state,
  error,
  isOnline = true,
  disabled,
  onSuggest,
  onAccept,
  onReject,
  preview,
  showTrigger = true,
}: AiSuggestionsPanelProps) {
  if (!aiConfigured) {
    return (
      <p className="text-[11px] text-muted-foreground">
        {featureName} unavailable —{" "}
        <Link href="/settings/ai" className="text-accent hover:underline">
          configure AI
        </Link>
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {showTrigger && (
        <AiSuggestTrigger
          label={label}
          aiConfigured={aiConfigured}
          loading={state === "loading"}
          disabled={disabled || !isOnline}
          onSuggest={onSuggest}
        />
      )}

      <AiSuggestionFeedback
        description={description}
        featureName={featureName}
        state={state}
        error={error}
        isOnline={isOnline}
        onAccept={onAccept}
        onReject={onReject}
        preview={preview}
      />
    </div>
  );
}

export function AiNotConfiguredHint({ featureName }: { featureName: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card/40 p-4 text-center">
      <Sparkles className="mx-auto mb-2 h-4 w-4 text-accent" />
      <p className="text-xs text-muted-foreground">
        Connect AI in Settings to use {featureName.toLowerCase()}.
      </p>
      <Button variant="secondary" size="sm" className="mt-2 gap-1.5" asChild>
        <Link href="/settings/ai">
          <Settings className="h-3.5 w-3.5" />
          Configure AI
        </Link>
      </Button>
    </div>
  );
}