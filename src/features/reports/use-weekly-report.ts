"use client";

import { useCallback, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db/schema";
import {
  getReportForWeek,
  saveWeeklyReport,
  updateReportUserNotes,
  deleteWeeklyReport,
} from "@/lib/db/mutations/reports";
import { generateWeeklyReportNarrative } from "@/lib/ai/generate-weekly-report";
import type { WeekLocalStats, WeeklyReport } from "@/types/report";

export function useWeeklyReport(
  weekStart: string,
  stats: WeekLocalStats | null,
) {
  const settings = useLiveQuery(() => db.settings.get("default"));
  const aiConfig = settings?.aiConfig;

  const savedReport = useLiveQuery(
    () => getReportForWeek(weekStart),
    [weekStart],
  );

  const [generating, setGenerating] = useState(false);
  const [streamText, setStreamText] = useState("");
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(async () => {
    if (!aiConfig || !stats || generating) return;

    setGenerating(true);
    setStreamText("");
    setError(null);

    try {
      await new Promise<void>((resolve) => {
        void generateWeeklyReportNarrative(
          aiConfig,
          weekStart,
          stats,
          {
            onToken: (token) => setStreamText((prev) => prev + token),
            onDone: async (fullText) => {
              try {
                await saveWeeklyReport({
                  weekStart,
                  localStats: stats,
                  aiNarrative: fullText,
                  providerSnapshot: `${aiConfig.providerPreset} / ${aiConfig.model}`,
                });
              } catch (err) {
                setError(
                  err instanceof Error ? err.message : "Failed to save report",
                );
              }
              resolve();
            },
            onError: (err) => {
              setError(err.message);
              resolve();
            },
          },
        );
      });
    } finally {
      setGenerating(false);
      setStreamText("");
    }
  }, [aiConfig, stats, weekStart, generating]);

  const saveNotes = useCallback(
    async (reportId: string, notes: string) => {
      await updateReportUserNotes(reportId, notes);
    },
    [],
  );

  const remove = useCallback(async (reportId: string) => {
    await deleteWeeklyReport(reportId);
  }, []);

  const displayReport: WeeklyReport | null = generating
    ? savedReport
      ? {
          ...savedReport,
          aiNarrative: streamText || savedReport.aiNarrative,
        }
      : stats
        ? {
            id: "generating",
            weekStart,
            localStats: stats,
            aiNarrative: streamText,
            generatedAt: new Date().toISOString(),
          }
        : null
    : (savedReport ?? null);

  return {
    report: displayReport,
    generating,
    streamText,
    error,
    aiConfigured: !!aiConfig?.baseUrl && !!aiConfig?.model,
    generate,
    saveNotes,
    remove,
  };
}