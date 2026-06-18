import { subWeeks, parseISO, format } from "date-fns";
import { db } from "@/lib/db/schema";
import { HESIA_SYSTEM_PROMPT_V1 } from "@/prompts/system";
import {
  aggregateWeekStatsFromAll,
  filterTasksForWeek,
  formatWeekStartISO,
  formatStatsSectionForPrompt,
} from "@/lib/stats/week-aggregator";
import { normalizeWeekStartsOn } from "@/lib/utils/week-config";
import type { Task } from "@/types/task";
import type { ChatMessage as AiChatMessage } from "./client";
import { resolveProfileForFeature } from "./feature-router";
import { buildMcpContext } from "@/lib/mcp/mcp-context";

export interface ContextBuildOptions {
  userMessage: string;
  sessionId?: string;
  maxContextWeeks?: number;
  customSystemPrompt?: string;
  includeChatHistory?: boolean;
}

export interface BuiltContext {
  messages: AiChatMessage[];
  summary: ContextSummary;
}

export interface ContextSummary {
  memoryCount: number;
  taskCount: number;
  reportCount: number;
  chatMessageCount: number;
  weekLabel: string;
}

function summarizeTasksByCategory(tasks: Task[]): string {
  const groups: Record<string, string[]> = {};
  for (const t of tasks) {
    const cat = t.category ?? "Uncategorized";
    if (!groups[cat]) groups[cat] = [];
    const planned = t.isPlanned ? "planned" : "flow";
    groups[cat].push(`${t.title} (${planned}, ${t.status})`);
  }

  return Object.entries(groups)
    .map(([cat, items]) => {
      const planned = items.filter((i) => i.includes("(planned")).length;
      return `${cat} (${items.length} tasks, ${planned} planned): ${items.slice(0, 5).join("; ")}${items.length > 5 ? "…" : ""}`;
    })
    .join("\n");
}

export async function buildContext(
  options: ContextBuildOptions,
): Promise<BuiltContext> {
  const maxWeeks = options.maxContextWeeks ?? 4;
  const settings = await db.settings.get("default");
  const memory = await db.userMemory.toArray();
  const allTasks = await db.tasks.toArray();
  const allTags = await db.tags.toArray();
  const allCategories = await db.categories.toArray();
  const reports = await db.weeklyReports
    .orderBy("generatedAt")
    .reverse()
    .limit(4)
    .toArray();

  const now = new Date();
  const weekStartsOn = normalizeWeekStartsOn(settings?.weekStartsOn);
  const weekTasks: Task[] = [];
  for (let i = 0; i < maxWeeks; i++) {
    const week = subWeeks(now, i);
    weekTasks.push(...filterTasksForWeek(allTasks, week, weekStartsOn));
  }
  const uniqueTasks = [...new Map(weekTasks.map((t) => [t.id, t])).values()];

  const stats = aggregateWeekStatsFromAll(allTasks, now, weekStartsOn);

  let sessionSummary = "";
  let chatMessages: { role: string; content: string }[] = [];
  if (options.includeChatHistory !== false && options.sessionId) {
    const session = await db.chatSessions.get(options.sessionId);
    sessionSummary = session?.contextSummary?.trim() ?? "";

    const msgs = await db.chatMessages
      .where("sessionId")
      .equals(options.sessionId)
      .sortBy("createdAt");

    let recent = msgs;
    if (session?.compactedBeforeMessageId) {
      const idx = msgs.findIndex(
        (m) => m.id === session.compactedBeforeMessageId,
      );
      if (idx >= 0) recent = msgs.slice(idx + 1);
    }

    chatMessages = recent
      .slice(-20)
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((m) => ({
        role: m.role,
        content: m.content,
      }));
  }

  const profileSection = settings?.profile?.username
    ? `User: ${settings.profile.username}${settings.profile.workspaceName ? ` | Workspace: ${settings.profile.workspaceName}` : ""}`
    : settings?.profile?.workspaceName
      ? `Workspace: ${settings.profile.workspaceName}`
      : "(No profile set)";

  const memorySection = memory.length
    ? memory.map((m) => `- [${m.type}] ${m.content}`).join("\n")
    : "(No saved memory yet)";

  const tagsSection = allTags.length
    ? allTags
        .sort((a, b) => b.usageCount - a.usageCount)
        .map((t) => `- ${t.name} (${t.usageCount} uses)`)
        .join("\n")
    : "(No tags yet — you may propose new names via create_tag or on tasks)";

  const categoriesSection = allCategories.length
    ? allCategories
        .sort((a, b) => b.usageCount - a.usageCount)
        .map((c) => `- ${c.name} (${c.usageCount} uses)`)
        .join("\n")
    : "(No categories yet — you may propose new names via create_category or on tasks)";

  const tasksSection =
    uniqueTasks.length <= 80
      ? uniqueTasks
          .map(
            (t) =>
              `- [id:${t.id}] ${t.title} | ${t.status} | ${t.isPlanned ? "planned" : "flow"} | tags: ${t.tags.join(", ") || "none"} | ${t.category ?? "no category"}${t.durationMinutes ? ` | ${t.durationMinutes}m` : ""}`,
          )
          .join("\n")
      : summarizeTasksByCategory(uniqueTasks);

  const reportsSection = reports.length
    ? reports
        .map(
          (r) =>
            `### Week ${r.weekStart}\n${(r.aiNarrative ?? "(no narrative)").slice(0, 500)}`,
        )
        .join("\n\n")
    : "(No past reports)";

  const mcpSection = await buildMcpContext(settings);

  const contextBlock = `## User Profile
${profileSection}

## Persistent User Memory
${memorySection}

## Current Period Stats & Breakdowns
${formatStatsSectionForPrompt(stats)}

## Tags (user's library)
${tagsSection}

## Categories (user's library)
${categoriesSection}

## Relevant Activities (last ${maxWeeks} weeks, ${uniqueTasks.length} tasks)
Use \`taskId\` from [id:…] for update_task, or \`titleMatch\` for bulk_update_tasks.
When the user asks to apply tags/categories you suggested, emit **bulk_update_tasks** — do not tell them to edit manually.
${tasksSection || "(No tasks in range)"}

## Recent Reflection History
${reportsSection}

## Earlier conversation summary (this session)
${sessionSummary || "(No prior summary — fresh thread)"}

## Conversation so far (recent turns)
${chatMessages.map((m) => `${m.role}: ${m.content}`).join("\n") || "(New conversation)"}${mcpSection ? `\n\n${mcpSection}` : ""}`;

  const chatProfile = resolveProfileForFeature(settings, "chat");
  const systemPrompt =
    options.customSystemPrompt?.trim() ||
    chatProfile?.customSystemPrompt?.trim() ||
    HESIA_SYSTEM_PROMPT_V1;

  const history = chatMessages
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

  const last = history[history.length - 1];
  const userAlreadyInHistory =
    last?.role === "user" && last.content === options.userMessage;

  const messages: AiChatMessage[] = [
    {
      role: "system",
      content: `${systemPrompt}\n\n---\n${contextBlock}`,
    },
    ...history,
    ...(userAlreadyInHistory
      ? []
      : [{ role: "user" as const, content: options.userMessage }]),
  ];

  return {
    messages,
    summary: {
      memoryCount: memory.length,
      taskCount: uniqueTasks.length,
      reportCount: reports.length,
      chatMessageCount: chatMessages.length,
      weekLabel: format(
        parseISO(formatWeekStartISO(now, weekStartsOn)),
        "MMM d, yyyy",
      ),
    },
  };
}