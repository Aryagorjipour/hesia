import { v4 as uuidv4 } from "uuid";
import { db } from "../schema";
import { toISO } from "@/lib/utils/dates";
import type { WeeklyReport, WeekLocalStats } from "@/types/report";

export async function getReportForWeek(
  weekStart: string,
): Promise<WeeklyReport | undefined> {
  return db.weeklyReports.where("weekStart").equals(weekStart).first();
}

export async function listWeeklyReports(): Promise<WeeklyReport[]> {
  return db.weeklyReports.orderBy("generatedAt").reverse().toArray();
}

export async function saveWeeklyReport(input: {
  weekStart: string;
  localStats: WeekLocalStats;
  aiNarrative: string;
  providerSnapshot?: string;
  userNotes?: string;
}): Promise<WeeklyReport> {
  const existing = await getReportForWeek(input.weekStart);
  const now = toISO(new Date());

  const report: WeeklyReport = {
    id: existing?.id ?? uuidv4(),
    weekStart: input.weekStart,
    localStats: input.localStats,
    aiNarrative: input.aiNarrative,
    userNotes: input.userNotes ?? existing?.userNotes,
    generatedAt: now,
    providerSnapshot: input.providerSnapshot ?? existing?.providerSnapshot,
  };

  await db.weeklyReports.put(report);
  return report;
}

export async function updateReportUserNotes(
  reportId: string,
  userNotes: string,
): Promise<void> {
  await db.weeklyReports.update(reportId, {
    userNotes: userNotes.trim() || undefined,
  });
}

export async function deleteWeeklyReport(reportId: string): Promise<void> {
  await db.weeklyReports.delete(reportId);
}