"use client";

import { useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { parseISO } from "date-fns";
import { BarChart3 } from "lucide-react";
import { db } from "@/lib/db/schema";
import { useSettingsStore } from "@/stores/settings-store";
import { formatWeekStartISO, aggregateWeekStatsFromAll } from "@/lib/stats/week-aggregator";
import { useWeekStartsOn } from "@/lib/hooks/use-week-starts-on";
import { MobilePageHeader } from "@/components/layout/mobile-page-header";
import { WeekSelector } from "./week-selector";
import { KpiCards } from "./kpi-cards";
import { PlannedUnplannedChart } from "./charts/planned-unplanned-chart";
import { CategoryChart } from "./charts/category-chart";
import { TagsChart } from "./charts/tags-chart";
import { DailyActivityChart } from "./charts/daily-activity-chart";
import { AiReflectionPanel } from "./ai-reflection-panel";
import { ReportHistory } from "./report-history";
import { EmptyState } from "@/components/ui/empty-state";

export function ReportsView() {
  const allTasks = useLiveQuery(() => db.tasks.toArray());
  const lastSelectedWeek = useSettingsStore((s) => s.lastSelectedWeek);
  const setLastSelectedWeek = useSettingsStore((s) => s.setLastSelectedWeek);
  const weekStartsOn = useWeekStartsOn();

  const selectedWeekStart =
    lastSelectedWeek ?? formatWeekStartISO(new Date(), weekStartsOn);

  const stats = useMemo(() => {
    if (!allTasks) return null;
    return aggregateWeekStatsFromAll(
      allTasks,
      parseISO(selectedWeekStart),
      weekStartsOn,
    );
  }, [allTasks, selectedWeekStart, weekStartsOn]);

  const isLoading = allTasks === undefined;
  const isEmpty = allTasks && allTasks.length === 0;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <MobilePageHeader
        title="Reports"
        subtitle="Local stats + optional AI reflections"
      />

      {isLoading ? (
        <div className="flex flex-1 items-center justify-center">
          <div className="h-8 w-8 animate-pulse rounded-full bg-accent/30" />
        </div>
      ) : isEmpty ? (
        <div className="flex flex-1 items-center justify-center p-8">
          <EmptyState
            icon={BarChart3}
            title="No data yet"
            description="Add tasks on your board to see weekly insights here."
          />
        </div>
      ) : stats ? (
        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-3 py-4 pb-bottom-nav sm:px-4 sm:py-6 lg:px-6 lg:py-8 lg:pb-8">
          <WeekSelector
            selectedWeekStart={selectedWeekStart}
            onSelect={setLastSelectedWeek}
          />

          <KpiCards stats={stats} />

          <div className="grid min-w-0 gap-4 lg:grid-cols-2">
            <PlannedUnplannedChart stats={stats} />
            <DailyActivityChart stats={stats} />
            <CategoryChart stats={stats} />
            <TagsChart stats={stats} />
          </div>

          <AiReflectionPanel weekStart={selectedWeekStart} stats={stats} />

          <ReportHistory
            selectedWeekStart={selectedWeekStart}
            onSelectWeek={setLastSelectedWeek}
          />
        </div>
      ) : null}
    </div>
  );
}