"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { format, parseISO } from "date-fns";
import { History } from "lucide-react";
import { listWeeklyReports } from "@/lib/db/mutations/reports";
import { formatWeekLabel } from "@/lib/utils/dates";
import { useWeekStartsOn } from "@/lib/hooks/use-week-starts-on";
import { cn } from "@/lib/utils/cn";

interface ReportHistoryProps {
  selectedWeekStart: string;
  onSelectWeek: (weekStart: string) => void;
}

export function ReportHistory({
  selectedWeekStart,
  onSelectWeek,
}: ReportHistoryProps) {
  const reports = useLiveQuery(() => listWeeklyReports(), []) ?? [];
  const weekStartsOn = useWeekStartsOn();

  if (reports.length === 0) return null;

  return (
    <div className="rounded-2xl border border-border/60 bg-card/30 p-4">
      <div className="mb-3 flex items-center gap-2">
        <History className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-medium text-foreground">Saved reflections</h3>
      </div>
      <ul className="space-y-1.5">
        {reports.map((report) => {
          const selected = report.weekStart === selectedWeekStart;
          return (
            <li key={report.id}>
              <button
                type="button"
                onClick={() => onSelectWeek(report.weekStart)}
                className={cn(
                  "flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs transition-colors",
                  selected
                    ? "bg-accent/15 text-accent"
                    : "text-muted-foreground hover:bg-muted/30",
                )}
              >
                <span className="font-medium">
                  {formatWeekLabel(parseISO(report.weekStart), weekStartsOn)}
                </span>
                <span className="opacity-60">
                  {format(parseISO(report.generatedAt), "MMM d")}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}