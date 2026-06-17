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
import { toast } from "@/lib/toast";
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

  const generate = useCallback(async () => {
    if (!aiConfig || !stats || generating) return;

    setGenerating(true);
    setStreamText("");

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
                toast.success({
                  title: "Reflection saved",
                  description: "Your weekly AI reflection has been saved.",
                });
              } catch (err) {
                toast.error({
                  title: "Could not save reflection",
                  description:
                    err instanceof Error ? err.message : "Failed to save report",
                });
              }
              resolve();
            },
            onError: (err) => {
              toast.error({
                title: "Generation failed",
                description: err.message,
              });
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
      toast.success({
        title: "Notes saved",
        description: "Your reflection notes have been updated.",
      });
    },
    [],
  );

  const remove = useCallback(async (reportId: string) => {
    await deleteWeeklyReport(reportId);
    toast.success({
      title: "Reflection deleted",
      description: "The saved reflection for this week has been removed.",
    });
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
    aiConfigured: !!aiConfig?.baseUrl && !!aiConfig?.model,
    generate,
    saveNotes,
    remove,
  };
}