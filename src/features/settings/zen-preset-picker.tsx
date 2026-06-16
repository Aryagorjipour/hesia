"use client";

import { Moon, Sun } from "lucide-react";
import type { ZenPreset } from "@/types/settings";
import {
  ZEN_PRESETS,
  DARK_ZEN_PRESET_IDS,
  LIGHT_ZEN_PRESET_IDS,
} from "@/lib/theme/presets";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils/cn";
import { Check } from "lucide-react";

interface ZenPresetPickerProps {
  selected: ZenPreset;
  onSelect: (preset: ZenPreset) => void;
}

function PresetGrid({
  ids,
  selected,
  onSelect,
}: {
  ids: readonly ZenPreset[];
  selected: ZenPreset;
  onSelect: (preset: ZenPreset) => void;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {ids.map((id) => {
        const preset = ZEN_PRESETS[id];
        const isSelected = selected === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onSelect(id)}
            className="rounded-2xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Card
              className={cn(
                "rounded-2xl transition-all duration-200 hover:scale-[1.01]",
                isSelected && "ring-2 ring-ring",
              )}
            >
              <CardContent className="p-4">
                <div
                  className="mb-3 flex h-20 items-center justify-center rounded-xl"
                  style={{ background: preset.background }}
                >
                  <div
                    className="h-8 w-8 rounded-full"
                    style={{ background: preset.accent }}
                  />
                </div>
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">
                      {preset.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {preset.description}
                    </p>
                  </div>
                  {isSelected && (
                    <Check
                      className="h-4 w-4 shrink-0 text-accent"
                      strokeWidth={2}
                      aria-hidden
                    />
                  )}
                </div>
              </CardContent>
            </Card>
          </button>
        );
      })}
    </div>
  );
}

export function ZenPresetPicker({ selected, onSelect }: ZenPresetPickerProps) {
  return (
    <div className="space-y-8">
      <section>
        <div className="mb-4 flex items-center gap-2">
          <Moon className="h-4 w-4 text-muted-foreground" aria-hidden />
          <div>
            <h2 className="text-sm font-medium text-foreground">
              Dark presets
              <span className="ml-1.5 font-normal text-muted-foreground">
                ({DARK_ZEN_PRESET_IDS.length})
              </span>
            </h2>
            <p className="text-xs text-muted-foreground">
              Low-light palettes for evening, OLED, and focused work
            </p>
          </div>
        </div>
        <PresetGrid
          ids={DARK_ZEN_PRESET_IDS}
          selected={selected}
          onSelect={onSelect}
        />
      </section>

      <section>
        <div className="mb-4 flex items-center gap-2">
          <Sun className="h-4 w-4 text-muted-foreground" aria-hidden />
          <div>
            <h2 className="text-sm font-medium text-foreground">
              Light presets
              <span className="ml-1.5 font-normal text-muted-foreground">
                ({LIGHT_ZEN_PRESET_IDS.length})
              </span>
            </h2>
            <p className="text-xs text-muted-foreground">
              Soft, low-glare themes for daytime and bright environments
            </p>
          </div>
        </div>
        <PresetGrid
          ids={LIGHT_ZEN_PRESET_IDS}
          selected={selected}
          onSelect={onSelect}
        />
      </section>
    </div>
  );
}