import {
  format,
  parseISO,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  subWeeks,
  isWithinInterval,
} from "date-fns";
import type { Task, TaskStatus } from "@/types/task";
import { DEFAULT_COLUMNS } from "@/types/task";
import type { DayTransitionLogEntry, WeekLocalStats } from "@/types/report";
import {
  DEFAULT_WEEK_STARTS_ON,
  type WeekStartsOn,
} from "@/lib/utils/week-config";
import { computeCalmFocusScore } from "./calm-focus-score";

export function getWeekStart(
  date: Date,
  weekStartsOn: WeekStartsOn = DEFAULT_WEEK_STARTS_ON,
): Date {
  return startOfWeek(date, { weekStartsOn });
}

export function getWeekEnd(
  date: Date,
  weekStartsOn: WeekStartsOn = DEFAULT_WEEK_STARTS_ON,
): Date {
  return endOfWeek(date, { weekStartsOn });
}

export function formatWeekStartISO(
  date: Date,
  weekStartsOn: WeekStartsOn = DEFAULT_WEEK_STARTS_ON,
): string {
  return format(getWeekStart(date, weekStartsOn), "yyyy-MM-dd");
}

/** Primary day a task counts toward for activity charts. */
export function getTaskActivityDate(task: Task): string {
  if (
    (task.status === "done" || task.status === "archived") &&
    task.completedAt
  ) {
    return format(parseISO(task.completedAt), "yyyy-MM-dd");
  }
  if (task.boardDate) return task.boardDate;
  return format(parseISO(task.createdAt), "yyyy-MM-dd");
}

function transitionInWeek(
  at: string,
  weekStart: Date,
  weekEnd: Date,
): boolean {
  const date = parseISO(at);
  return isWithinInterval(date, { start: weekStart, end: weekEnd });
}

function taskInWeek(task: Task, weekStart: Date, weekEnd: Date): boolean {
  const activityDate = parseISO(getTaskActivityDate(task));
  if (isWithinInterval(activityDate, { start: weekStart, end: weekEnd })) {
    return true;
  }

  if (task.startedOnBoardDate) {
    const started = parseISO(task.startedOnBoardDate);
    if (isWithinInterval(started, { start: weekStart, end: weekEnd })) {
      return true;
    }
  }

  if (
    task.dayTransitions?.some((t) => transitionInWeek(t.at, weekStart, weekEnd))
  ) {
    return true;
  }

  return false;
}

export function filterTasksForWeek(
  tasks: Task[],
  weekDate: Date,
  weekStartsOn: WeekStartsOn = DEFAULT_WEEK_STARTS_ON,
): Task[] {
  const weekStart = getWeekStart(weekDate, weekStartsOn);
  const weekEnd = getWeekEnd(weekDate, weekStartsOn);
  return tasks.filter((t) => taskInWeek(t, weekStart, weekEnd));
}

function collectDayTransitions(
  tasks: Task[],
  weekStart: Date,
  weekEnd: Date,
): DayTransitionLogEntry[] {
  const entries: DayTransitionLogEntry[] = [];

  for (const task of tasks) {
    for (const transition of task.dayTransitions ?? []) {
      if (!transitionInWeek(transition.at, weekStart, weekEnd)) continue;
      entries.push({
        taskId: task.id,
        taskTitle: task.title,
        fromBoardDate: transition.fromBoardDate,
        toBoardDate: transition.toBoardDate,
        fromStatus: transition.fromStatus,
        toStatus: transition.toStatus,
        at: transition.at,
        reason: transition.reason,
      });
    }
  }

  return entries.sort(
    (a, b) => parseISO(a.at).getTime() - parseISO(b.at).getTime(),
  );
}

export function aggregateWeekStats(
  tasks: Task[],
  weekDate: Date,
  previousWeekTasks?: Task[],
  weekStartsOn: WeekStartsOn = DEFAULT_WEEK_STARTS_ON,
): WeekLocalStats {
  const weekStart = getWeekStart(weekDate, weekStartsOn);
  const weekEnd = getWeekEnd(weekDate, weekStartsOn);
  const weekTasks = filterTasksForWeek(tasks, weekDate, weekStartsOn);

  const dayTransitionLog = collectDayTransitions(tasks, weekStart, weekEnd);
  const carryTransitions = dayTransitionLog.filter(
    (t) => t.reason === "carry_forward",
  );
  const carriedForwardCount = carryTransitions.length;
  const carriedFromInProgressCount = carryTransitions.filter(
    (t) => t.fromStatus === "doing",
  ).length;

  const plannedCount = weekTasks.filter((t) => t.isPlanned).length;
  const unplannedCount = weekTasks.length - plannedCount;
  const completedTasks = weekTasks.filter(
    (t) => t.status === "done" || t.status === "archived",
  ).length;

  const byCategory: WeekLocalStats["byCategory"] = {};
  const byTag: WeekLocalStats["byTag"] = {};
  const byStatus = DEFAULT_COLUMNS.reduce(
    (acc, s) => {
      acc[s] = weekTasks.filter((t) => t.status === s).length;
      return acc;
    },
    {} as Record<TaskStatus, number>,
  );

  for (const task of weekTasks) {
    const cat = task.category ?? "Uncategorized";
    if (!byCategory[cat]) {
      byCategory[cat] = { total: 0, planned: 0, unplanned: 0 };
    }
    byCategory[cat].total++;
    if (task.isPlanned) byCategory[cat].planned++;
    else byCategory[cat].unplanned++;

    for (const tag of task.tags) {
      if (!byTag[tag]) {
        byTag[tag] = { total: 0, planned: 0, unplanned: 0 };
      }
      byTag[tag].total++;
      if (task.isPlanned) byTag[tag].planned++;
      else byTag[tag].unplanned++;
    }
  }

  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });
  const dailyActivity = days.map((day) => {
    const dateStr = format(day, "yyyy-MM-dd");
    const dayTasks = weekTasks.filter(
      (t) => getTaskActivityDate(t) === dateStr,
    );
    const carriedForward = carryTransitions.filter(
      (t) => format(parseISO(t.at), "yyyy-MM-dd") === dateStr,
    ).length;

    return {
      date: dateStr,
      count: dayTasks.length,
      planned: dayTasks.filter((t) => t.isPlanned).length,
      unplanned: dayTasks.filter((t) => !t.isPlanned).length,
      carriedForward,
    };
  });

  const totalTasks = weekTasks.length;
  const plannedPercent =
    totalTasks > 0 ? Math.round((plannedCount / totalTasks) * 100) : 0;
  const completionRate =
    totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  let trendsVsPreviousWeek: WeekLocalStats["trendsVsPreviousWeek"];
  if (previousWeekTasks) {
    const prevPlanned = previousWeekTasks.filter((t) => t.isPlanned).length;
    const prevTotal = previousWeekTasks.length;
    const prevPlannedPercent =
      prevTotal > 0 ? Math.round((prevPlanned / prevTotal) * 100) : 0;
    trendsVsPreviousWeek = {
      plannedPercentDelta: plannedPercent - prevPlannedPercent,
      totalDelta: totalTasks - prevTotal,
    };
  }

  return {
    weekStart: format(weekStart, "yyyy-MM-dd"),
    weekEnd: format(weekEnd, "yyyy-MM-dd"),
    totalTasks,
    completedTasks,
    plannedCount,
    unplannedCount,
    plannedPercent,
    completionRate,
    calmFocusScore: computeCalmFocusScore(
      plannedCount,
      unplannedCount,
      completedTasks,
      totalTasks,
    ),
    carriedForwardCount,
    carriedFromInProgressCount,
    dayTransitionLog,
    byCategory,
    byTag,
    byStatus,
    dailyActivity,
    trendsVsPreviousWeek,
  };
}

export function aggregateWeekStatsFromAll(
  allTasks: Task[],
  weekDate: Date,
  weekStartsOn: WeekStartsOn = DEFAULT_WEEK_STARTS_ON,
): WeekLocalStats {
  const prevWeek = subWeeks(weekDate, 1);
  const prevTasks = filterTasksForWeek(allTasks, prevWeek, weekStartsOn);
  return aggregateWeekStats(allTasks, weekDate, prevTasks, weekStartsOn);
}

export function formatStatsSectionForPrompt(stats: WeekLocalStats): string {
  const catLines = Object.entries(stats.byCategory)
    .map(([k, v]) => `  ${k}: ${v.total} (${v.planned} planned, ${v.unplanned} flow)`)
    .join("\n");
  const tagLines = Object.entries(stats.byTag)
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, 10)
    .map(([k, v]) => `  #${k}: ${v.total}`)
    .join("\n");
  const trendLine = stats.trendsVsPreviousWeek
    ? `Trend vs prior week: ${stats.trendsVsPreviousWeek.totalDelta >= 0 ? "+" : ""}${stats.trendsVsPreviousWeek.totalDelta} tasks, planned ${stats.trendsVsPreviousWeek.plannedPercentDelta >= 0 ? "+" : ""}${stats.trendsVsPreviousWeek.plannedPercentDelta}%`
    : "";

  return `Week: ${stats.weekStart} – ${stats.weekEnd}
Total: ${stats.totalTasks} | Planned: ${stats.plannedCount} (${stats.plannedPercent}%) | Flow: ${stats.unplannedCount}
Completed: ${stats.completedTasks} (${stats.completionRate}%) | Calm focus: ${stats.calmFocusScore ?? "n/a"}
Carried forward: ${stats.carriedForwardCount} (${stats.carriedFromInProgressCount} from in progress)
${trendLine}

By category:
${catLines || "  (none)"}

Top tags:
${tagLines || "  (none)"}`;
}