"use client";

import { format } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { getRecentWeeks } from "@/lib/utils/dates";
import {
  formatWeekStartISO,
  getWeekStart,
  getWeekEnd,
} from "@/lib/stats/week-aggregator";
import { useWeekStartsOn } from "@/lib/hooks/use-week-starts-on";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

interface WeekSelectorProps {
  selectedWeekStart: string;
  onSelect: (weekStart: string) => void;
}

export function WeekSelector({ selectedWeekStart, onSelect }: WeekSelectorProps) {
  const weekStartsOn = useWeekStartsOn();
  const weeks = getRecentWeeks(8);

  function shiftWeek(delta: number) {
    const idx = weeks.findIndex(
      (w) => formatWeekStartISO(w, weekStartsOn) === selectedWeekStart,
    );
    const newIdx = Math.max(
      0,
      Math.min(weeks.length - 1, (idx >= 0 ? idx : 0) + delta),
    );
    onSelect(formatWeekStartISO(weeks[newIdx], weekStartsOn));
  }

  return (
    <div className="flex items-center justify-start gap-1 sm:justify-center sm:gap-1.5">
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 shrink-0"
        onClick={() => shiftWeek(1)}
        aria-label="Previous week"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      <div className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto pb-1 sm:flex-none sm:overflow-visible [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {weeks.map((week) => {
          const weekStart = formatWeekStartISO(week, weekStartsOn);
          const selected = weekStart === selectedWeekStart;
          const start = getWeekStart(week, weekStartsOn);
          const end = getWeekEnd(week, weekStartsOn);

          return (
            <button
              key={weekStart}
              type="button"
              onClick={() => onSelect(weekStart)}
              aria-pressed={selected}
              className={cn(
                "shrink-0 rounded-2xl px-4 py-2 text-left transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                selected
                  ? "bg-accent/15 text-accent ring-1 ring-accent/30"
                  : "bg-muted/30 text-muted-foreground hover:bg-muted/50",
              )}
            >
              <span className="block text-xs font-medium leading-tight">
                {format(start, "MMM d")}
              </span>
              <span
                className={cn(
                  "block text-xs font-medium leading-tight",
                  selected ? "text-accent/80" : "text-muted-foreground",
                )}
              >
                {format(end, "MMM d, yyyy")}
              </span>
            </button>
          );
        })}
      </div>

      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 shrink-0"
        onClick={() => shiftWeek(-1)}
        disabled={
          selectedWeekStart === formatWeekStartISO(weeks[0], weekStartsOn)
        }
        aria-label="Next week"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}