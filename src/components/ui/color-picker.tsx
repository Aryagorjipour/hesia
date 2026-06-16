"use client";

import { useState } from "react";
import { Check, Pipette } from "lucide-react";
import {
  HESIA_COLOR_PRESETS,
  isValidHexColor,
  normalizeHexColor,
} from "@/lib/theme/color-palette";
import { cn } from "@/lib/utils/cn";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";

interface ColorPickerProps {
  value: string;
  onChange: (hex: string) => void;
  disabled?: boolean;
  /** Inline row — swatch only, no hex text */
  compact?: boolean;
  className?: string;
  "aria-label"?: string;
}

export function ColorPicker({
  value,
  onChange,
  disabled = false,
  compact = false,
  className,
  "aria-label": ariaLabel = "Choose color",
}: ColorPickerProps) {
  const [open, setOpen] = useState(false);
  const [hexDraft, setHexDraft] = useState(value);

  function selectColor(hex: string) {
    onChange(hex);
    setHexDraft(hex);
  }

  function commitHex() {
    const normalized = normalizeHexColor(hexDraft);
    if (normalized) {
      onChange(normalized);
      setHexDraft(normalized);
    }
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setHexDraft(value);
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          aria-label={ariaLabel}
          className={cn(
            "inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl border border-border bg-muted/30 transition-colors",
            "hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            "disabled:cursor-not-allowed disabled:opacity-50",
            compact ? "h-11 w-11 p-0" : "h-11 min-w-[5.5rem] px-3",
            className,
          )}
        >
          <span
            className={cn(
              "rounded-lg ring-1 ring-white/10",
              compact ? "h-6 w-6" : "h-5 w-5",
            )}
            style={{ backgroundColor: value }}
            aria-hidden
          />
          {!compact && (
            <span className="font-mono text-xs uppercase text-muted-foreground">
              {value.replace("#", "")}
            </span>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-[15.5rem]">
        <div className="mb-2.5 flex items-center gap-2">
          <Pipette className="h-3.5 w-3.5 text-accent" aria-hidden />
          <p className="text-xs font-medium text-foreground">Pick a color</p>
        </div>

        <div className="grid grid-cols-8 gap-1.5">
          {HESIA_COLOR_PRESETS.map((preset) => {
            const selected = value.toLowerCase() === preset.toLowerCase();
            return (
              <button
                key={preset}
                type="button"
                title={preset}
                onClick={() => selectColor(preset)}
                className={cn(
                  "relative flex h-7 w-7 items-center justify-center rounded-lg transition-transform hover:scale-105",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  selected && "ring-2 ring-accent ring-offset-2 ring-offset-card",
                )}
                style={{ backgroundColor: preset }}
              >
                {selected && (
                  <Check
                    className="h-3.5 w-3.5 text-white drop-shadow-sm"
                    strokeWidth={3}
                    aria-hidden
                  />
                )}
              </button>
            );
          })}
        </div>

        <div className="mt-3 space-y-1.5">
          <label
            htmlFor="color-picker-hex"
            className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground"
          >
            Custom hex
          </label>
          <div className="flex gap-2">
            <span
              className="h-11 w-11 shrink-0 rounded-xl ring-1 ring-border"
              style={{ backgroundColor: isValidHexColor(hexDraft) ? hexDraft : value }}
              aria-hidden
            />
            <Input
              id="color-picker-hex"
              value={hexDraft}
              onChange={(e) => setHexDraft(e.target.value)}
              onBlur={commitHex}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  commitHex();
                }
              }}
              placeholder="#6366f1"
              className="h-11 font-mono text-xs uppercase"
              spellCheck={false}
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}