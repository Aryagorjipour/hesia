"use client";

import type { WeekLocalStats } from "@/types/report";
import { ChartWrapper } from "@/components/ui/chart-wrapper";
import { TagChip } from "@/components/ui/tag-chip";

interface TagsChartProps {
  stats: WeekLocalStats;
}

export function TagsChart({ stats }: TagsChartProps) {
  const tags = Object.entries(stats.byTag)
    .map(([name, v]) => ({
      name,
      total: v.total,
      plannedPct: v.total > 0 ? Math.round((v.planned / v.total) * 100) : 0,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 12);

  if (tags.length === 0) {
    return (
      <ChartWrapper title="Top tags">
        <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
          No tags this week
        </div>
      </ChartWrapper>
    );
  }

  const max = tags[0]?.total ?? 1;

  return (
    <ChartWrapper title="Top tags" description="Count and % planned per tag">
      <div className="flex h-full min-h-0 flex-col gap-3 overflow-y-auto overscroll-contain py-0.5 pr-1">
        {tags.map((tag) => (
          <div key={tag.name} className="space-y-1">
            <div className="flex items-center justify-between gap-2">
              <TagChip name={tag.name} />
              <span className="text-xs text-muted-foreground">
                {tag.total} · {tag.plannedPct}% planned
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted/50">
              <div
                className="h-full rounded-full bg-accent/70 transition-all duration-500"
                style={{ width: `${(tag.total / max) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </ChartWrapper>
  );
}