"use client";

import { TrendingDown, TrendingUp, Minus } from "lucide-react";
import type { WeekLocalStats } from "@/types/report";
import { cn } from "@/lib/utils/cn";

interface KpiCardsProps {
  stats: WeekLocalStats;
}

function TrendBadge({ delta }: { delta: number }) {
  if (delta === 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground">
        <Minus className="h-3 w-3" /> —
      </span>
    );
  }
  const up = delta > 0;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-xs",
        up ? "text-planned" : "text-unplanned",
      )}
    >
      {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {up ? "+" : ""}
      {delta}
    </span>
  );
}

export function KpiCards({ stats }: KpiCardsProps) {
  const cards = [
    {
      label: "Total activities",
      value: stats.totalTasks,
      sub: stats.trendsVsPreviousWeek
        ? <TrendBadge delta={stats.trendsVsPreviousWeek.totalDelta} />
        : null,
    },
    {
      label: "Planned",
      value: `${stats.plannedPercent}%`,
      sub: (
        <span className="text-xs text-muted-foreground">
          {stats.plannedCount} tasks
        </span>
      ),
    },
    {
      label: "Flow wins",
      value: `${100 - stats.plannedPercent}%`,
      sub: (
        <span className="text-xs text-muted-foreground">
          {stats.unplannedCount} tasks
        </span>
      ),
    },
    {
      label: "Completion",
      value: `${stats.completionRate}%`,
      sub: (
        <span className="text-xs text-muted-foreground">
          {stats.completedTasks} done
        </span>
      ),
    },
    {
      label: "Calm focus",
      value: stats.calmFocusScore ?? "—",
      sub: stats.trendsVsPreviousWeek ? (
        <TrendBadge delta={stats.trendsVsPreviousWeek.plannedPercentDelta} />
      ) : (
        <span className="text-xs text-muted-foreground">gentle score</span>
      ),
    },
    ...(stats.carriedForwardCount > 0
      ? [
          {
            label: "Carried forward",
            value: stats.carriedForwardCount,
            sub: (
              <span className="text-xs text-muted-foreground">
                {stats.carriedFromInProgressCount} from in progress
              </span>
            ),
          },
        ]
      : []),
  ];

  const lgCols =
    cards.length >= 6
      ? "lg:grid-cols-6"
      : cards.length === 5
        ? "lg:grid-cols-5"
        : "lg:grid-cols-4";

  return (
    <div
      className={cn(
        "grid w-full grid-cols-2 gap-3 sm:grid-cols-3",
        lgCols,
      )}
    >
      {cards.map((card) => (
        <div
          key={card.label}
          className="rounded-2xl border border-border bg-card/60 p-4 backdrop-blur-sm"
        >
          <p className="text-xs text-muted-foreground">{card.label}</p>
          <p className="mt-1 text-2xl font-medium text-foreground">{card.value}</p>
          <div className="mt-1">{card.sub}</div>
        </div>
      ))}
    </div>
  );
}