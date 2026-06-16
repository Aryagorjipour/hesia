"use client";

import {
  WEEK_START_OPTIONS,
  type WeekStartsOn,
} from "@/lib/utils/week-config";
import { cn } from "@/lib/utils/cn";
import { Label } from "@/components/ui/label";

interface WeekStartPickerProps {
  value: WeekStartsOn;
  onChange: (value: WeekStartsOn) => void;
  disabled?: boolean;
  compact?: boolean;
  label?: string;
  description?: string;
}

export function WeekStartPicker({
  value,
  onChange,
  disabled = false,
  compact = false,
  label = "First day of week",
  description = "Used for reports, weekly reflections, and stats.",
}: WeekStartPickerProps) {
  return (
    <div className="space-y-3">
      <div>
        <Label>{label}</Label>
        {description ? (
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        ) : null}
      </div>
      <div
        className={cn(
          "grid gap-2",
          compact
            ? "grid-cols-4 sm:grid-cols-7"
            : "grid-cols-2 sm:grid-cols-4 lg:grid-cols-7",
        )}
        role="radiogroup"
        aria-label={label}
      >
        {WEEK_START_OPTIONS.map((option) => {
          const selected = value === option.value;
          const displayLabel = compact ? option.short : option.label;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={option.label}
              disabled={disabled}
              onClick={() => onChange(option.value)}
              className={cn(
                "min-w-0 rounded-xl border px-2 py-2.5 text-center text-xs font-medium transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                "disabled:cursor-not-allowed disabled:opacity-50",
                selected
                  ? "border-accent/40 bg-accent/15 text-accent"
                  : "border-border/60 bg-muted/20 text-muted-foreground hover:border-border hover:bg-muted/40 hover:text-foreground",
              )}
            >
              <span className="block truncate">{displayLabel}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}