import { parseISO } from "date-fns";
import { db } from "@/lib/db/schema";
import { streamChatCompletion, type ChatMessage } from "./client";
import { buildReportGeneratorPrompt } from "@/prompts/report-generator";
import { HESIA_SYSTEM_PROMPT_V1 } from "@/prompts/system";
import {
  filterTasksForWeek,
  formatStatsSectionForPrompt,
} from "@/lib/stats/week-aggregator";
import type { WeekLocalStats } from "@/types/report";
import type { AiConfig } from "@/types/settings";
import { formatWeekLabel } from "@/lib/utils/dates";
import { normalizeWeekStartsOn } from "@/lib/utils/week-config";

export interface ReportStreamCallbacks {
  onToken: (token: string) => void;
  onDone: (fullText: string) => void;
  onError: (error: Error) => void;
}

export async function buildReportGenerationMessages(
  weekStart: string,
  stats: WeekLocalStats,
): Promise<ChatMessage[]> {
  const settings = await db.settings.get("default");
  const weekStartsOn = normalizeWeekStartsOn(settings?.weekStartsOn);
  const memory = await db.userMemory.toArray();
  const allTasks = await db.tasks.toArray();
  const weekTasks = filterTasksForWeek(
    allTasks,
    parseISO(weekStart),
    weekStartsOn,
  );

  const weekLabel = formatWeekLabel(parseISO(weekStart), weekStartsOn);
  const memorySection = memory.length
    ? memory.map((m) => `- [${m.type}] ${m.content}`).join("\n")
    : "(none)";

  const tasksSection =
    weekTasks.length === 0
      ? "(No tasks this week)"
      : weekTasks
          .slice(0, 60)
          .map(
            (t) =>
              `- ${t.title} | ${t.status} | ${t.isPlanned ? "planned" : "flow"} | ${t.category ?? "—"} | tags: ${t.tags.join(", ") || "—"}`,
          )
          .join("\n");

  const carrySection =
    stats.dayTransitionLog.length > 0
      ? stats.dayTransitionLog
          .map(
            (t) =>
              `- ${t.taskTitle}: ${t.fromBoardDate} → ${t.toBoardDate} (${t.fromStatus})`,
          )
          .join("\n")
      : "(none)";

  return [
    {
      role: "system",
      content: `${HESIA_SYSTEM_PROMPT_V1}\n\n${buildReportGeneratorPrompt(weekLabel)}`,
    },
    {
      role: "user",
      content: `Generate the weekly reflection for ${weekLabel}.

## Local stats (authoritative — use these numbers only)
${formatStatsSectionForPrompt(stats)}

## Day transitions (carry-forward)
${carrySection}

## User memory
${memorySection}

## Tasks this week (${weekTasks.length})
${tasksSection}`,
    },
  ];
}

export async function generateWeeklyReportNarrative(
  config: AiConfig,
  weekStart: string,
  stats: WeekLocalStats,
  callbacks: ReportStreamCallbacks,
): Promise<void> {
  const messages = await buildReportGenerationMessages(weekStart, stats);

  await streamChatCompletion(config, { messages }, {
    onToken: callbacks.onToken,
    onDone: callbacks.onDone,
    onError: callbacks.onError,
  });
}