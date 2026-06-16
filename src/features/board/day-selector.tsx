"use client";

import { useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { BoardPermissions } from "@/lib/utils/board-dates";
import {
  getBoardDaysAround,
  formatBoardDayLabel,
  formatBoardDayShort,
  getBoardDayModeLabel,
  todayISO,
  getBoardDayMode,
} from "@/lib/utils/board-dates";
import { BoardDayBanner } from "./board-day-banner";
import { cn } from "@/lib/utils/cn";

interface DaySelectorProps {
  selectedBoardDate: string;
  onSelect: (date: string) => void;
  permissions: BoardPermissions;
  dismissedInboxBannerKeys: string[];
  onDismissInboxBanner: (key: string) => void;
}

export function DaySelector({
  selectedBoardDate,
  onSelect,
  permissions,
  dismissedInboxBannerKeys,
  onDismissInboxBanner,
}: DaySelectorProps) {
  const today = todayISO();
  const days = getBoardDaysAround(today, 7, 7);
  const selectedIndex = days.indexOf(selectedBoardDate);
  const scrollRef = useRef<HTMLDivElement>(null);
  const selectedMode = getBoardDayMode(selectedBoardDate, today);
  const modeLabel = getBoardDayModeLabel(selectedMode);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    const selected = container.querySelector<HTMLElement>(
      '[data-selected="true"]',
    );
    selected?.scrollIntoView({
      inline: "start",
      block: "nearest",
      behavior: "smooth",
    });
  }, [selectedBoardDate]);

  function shift(delta: number) {
    const idx = selectedIndex >= 0 ? selectedIndex : days.indexOf(today);
    const next = Math.max(0, Math.min(days.length - 1, idx + delta));
    onSelect(days[next]);
  }

  return (
    <div className="shrink-0 border-b border-border/60">
      <div className="flex items-center justify-start gap-1 px-3 py-2 sm:justify-center sm:gap-1.5 sm:px-4 sm:py-2.5 lg:px-6">
        <button
          type="button"
          onClick={() => shift(-1)}
          disabled={selectedIndex <= 0}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted/50 disabled:opacity-30"
          aria-label="Earlier day"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        <div
          ref={scrollRef}
          className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto sm:flex-none sm:overflow-visible [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {days.map((day) => {
            const selected = day === selectedBoardDate;
            const mode = getBoardDayMode(day, today);
            const chipMode = getBoardDayModeLabel(mode);

            return (
              <button
                key={day}
                type="button"
                data-selected={selected}
                onClick={() => onSelect(day)}
                className={cn(
                  "shrink-0 snap-start rounded-xl transition-colors",
                  selected
                    ? "bg-accent/15 px-2.5 py-1.5 text-accent ring-1 ring-accent/30 sm:px-3 sm:py-2"
                    : "px-2 py-1 text-muted-foreground hover:bg-muted/35 sm:px-2.5 sm:py-1.5",
                )}
              >
                <span
                  className={cn(
                    "block whitespace-nowrap font-medium leading-tight",
                    selected ? "text-xs sm:text-sm" : "text-[11px] sm:text-xs",
                  )}
                >
                  <span className="sm:hidden">
                    {selected ? formatBoardDayLabel(day) : formatBoardDayShort(day)}
                  </span>
                  <span className="hidden sm:block">{formatBoardDayLabel(day)}</span>
                </span>
                {chipMode && (
                  <span className="block text-[9px] leading-tight opacity-55 sm:text-[10px]">
                    {chipMode}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => shift(1)}
          disabled={selectedIndex >= days.length - 1}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted/50 disabled:opacity-30"
          aria-label="Later day"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Mobile: current day label when strip is cramped */}
      <div className="flex items-center justify-center gap-2 border-t border-border/30 px-4 py-1 sm:hidden">
        <span className="text-xs font-medium text-foreground">
          {formatBoardDayLabel(selectedBoardDate)}
        </span>
        {modeLabel && (
          <span className="text-[10px] text-muted-foreground">{modeLabel}</span>
        )}
        {selectedBoardDate !== today && (
          <button
            type="button"
            onClick={() => onSelect(today)}
            className="rounded-lg bg-accent/10 px-2 py-0.5 text-[10px] font-medium text-accent"
          >
            Today
          </button>
        )}
      </div>

      <BoardDayBanner
        boardDate={selectedBoardDate}
        permissions={permissions}
        dismissedInboxBannerKeys={dismissedInboxBannerKeys}
        onDismissInboxBanner={onDismissInboxBanner}
      />
    </div>
  );
}