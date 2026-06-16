import { z } from "zod";
import { TaskStatusSchema } from "./task";

export const DayTransitionLogEntrySchema = z.object({
  taskId: z.string().uuid(),
  taskTitle: z.string(),
  fromBoardDate: z.string(),
  toBoardDate: z.string(),
  fromStatus: TaskStatusSchema,
  toStatus: TaskStatusSchema,
  at: z.string().datetime(),
  reason: z.enum(["carry_forward", "manual"]),
});

export type DayTransitionLogEntry = z.infer<typeof DayTransitionLogEntrySchema>;

export const WeekLocalStatsSchema = z.object({
  weekStart: z.string(),
  weekEnd: z.string(),
  totalTasks: z.number(),
  completedTasks: z.number(),
  plannedCount: z.number(),
  unplannedCount: z.number(),
  plannedPercent: z.number(),
  completionRate: z.number(),
  calmFocusScore: z.number().optional(),
  carriedForwardCount: z.number(),
  carriedFromInProgressCount: z.number(),
  dayTransitionLog: z.array(DayTransitionLogEntrySchema),
  byCategory: z.record(
    z.string(),
    z.object({
      total: z.number(),
      planned: z.number(),
      unplanned: z.number(),
    }),
  ),
  byTag: z.record(
    z.string(),
    z.object({
      total: z.number(),
      planned: z.number(),
      unplanned: z.number(),
    }),
  ),
  byStatus: z.record(TaskStatusSchema, z.number()),
  dailyActivity: z.array(
    z.object({
      date: z.string(),
      count: z.number(),
      planned: z.number(),
      unplanned: z.number(),
      carriedForward: z.number(),
    }),
  ),
  trendsVsPreviousWeek: z
    .object({
      plannedPercentDelta: z.number(),
      totalDelta: z.number(),
    })
    .optional(),
});

export type WeekLocalStats = z.infer<typeof WeekLocalStatsSchema>;

export const WeeklyReportSchema = z.object({
  id: z.string().uuid(),
  weekStart: z.string(),
  localStats: WeekLocalStatsSchema,
  aiNarrative: z.string().optional(),
  userNotes: z.string().optional(),
  generatedAt: z.string().datetime(),
  providerSnapshot: z.string().optional(),
});

export type WeeklyReport = z.infer<typeof WeeklyReportSchema>;