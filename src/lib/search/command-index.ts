import { format, parseISO } from "date-fns";
import type { Task } from "@/types/task";
import type { Tag } from "@/types/tag";
import type { Category } from "@/types/category";
import type { WeeklyReport } from "@/types/report";
import type { ChatSession, ChatMessage } from "@/types/chat";
import type { WeekStartsOn } from "@/lib/utils/week-config";
import {
  formatWeekStartISO,
  getTaskActivityDate,
} from "@/lib/stats/week-aggregator";
import { formatWeekLabel } from "@/lib/utils/dates";
import {
  formatBoardDayLabel,
  todayISO,
} from "@/lib/utils/board-dates";
import { COLUMN_LABELS } from "@/types/task";
import { NAVIGATION_ITEMS } from "./navigation-catalog";
import { parseBoardDateQuery } from "./parse-board-date-query";
import { resolveTaskBoardDate } from "./resolve-task-board-date";
import {
  COMMAND_GROUP_ORDER,
  type CommandItem,
  type CommandItemType,
} from "./command-types";

const MAX_RESULTS = 50;
const MAX_CHAT_MESSAGES_INDEXED = 200;

export interface CommandIndexData {
  tasks: Task[];
  tags: Tag[];
  categories: Category[];
  weeklyReports: WeeklyReport[];
  weekStartsOn: WeekStartsOn;
  includeChat?: boolean;
  chatSessions?: ChatSession[];
  chatMessages?: ChatMessage[];
}

function truncateSnippet(text: string, max = 80): string {
  const oneLine = text.replace(/\s+/g, " ").trim();
  return oneLine.length > max ? `${oneLine.slice(0, max)}…` : oneLine;
}

function searchableText(item: CommandItem): string {
  return [item.label, item.description ?? "", ...(item.keywords ?? [])]
    .join(" ")
    .toLowerCase();
}

function scoreMatch(query: string, text: string, label: string): number {
  if (!query) return 1;

  const q = query.toLowerCase();
  const labelLower = label.toLowerCase();

  if (labelLower === q) return 200;
  if (labelLower.startsWith(q)) return 150;

  const words = text.split(/\s+/);
  if (words.some((w) => w.startsWith(q))) return 120;
  if (text.includes(q)) return 80;

  return 0;
}

export function buildCommandIndex(data: CommandIndexData): CommandItem[] {
  const items: CommandItem[] = [...NAVIGATION_ITEMS];

  const boardDates = new Set<string>();
  for (const task of data.tasks) {
    if (task.status !== "inbox" && task.boardDate) {
      boardDates.add(task.boardDate);
    }
  }
  boardDates.add(todayISO());

  const sortedDays = [...boardDates].sort((a, b) => b.localeCompare(a));
  for (const boardDate of sortedDays) {
    items.push({
      id: `board-day-${boardDate}`,
      type: "board-day",
      label: formatBoardDayLabel(boardDate),
      description: boardDate,
      boardDate,
      keywords: [boardDate, format(parseISO(boardDate), "MMM d")],
    });
  }

  for (const task of data.tasks) {
    const boardDate = resolveTaskBoardDate(task);
    items.push({
      id: `task-${task.id}`,
      type: "task",
      label: task.title,
      description: `${COLUMN_LABELS[task.status]} · ${formatBoardDayLabel(boardDate)}`,
      taskId: task.id,
      boardDate,
      keywords: [
        task.description ?? "",
        task.notes ?? "",
        task.category ?? "",
        ...task.tags,
        task.status,
      ],
    });
  }

  for (const tag of data.tags) {
    items.push({
      id: `tag-${tag.name}`,
      type: "tag",
      label: tag.name,
      description:
        tag.usageCount > 0 ? `${tag.usageCount} tasks` : "Unused tag",
      tagName: tag.name,
      keywords: ["tag", "filter"],
    });
  }

  for (const category of data.categories) {
    items.push({
      id: `category-${category.name}`,
      type: "category",
      label: category.name,
      description: "Category filter",
      categoryName: category.name,
      keywords: ["category", "filter"],
    });
  }

  const weekKeys = new Set<string>();
  for (const report of data.weeklyReports) {
    weekKeys.add(report.weekStart);
  }
  for (const task of data.tasks) {
    const activityDate = getTaskActivityDate(task);
    weekKeys.add(
      formatWeekStartISO(parseISO(activityDate), data.weekStartsOn),
    );
  }
  weekKeys.add(formatWeekStartISO(new Date(), data.weekStartsOn));

  const sortedWeeks = [...weekKeys].sort((a, b) => b.localeCompare(a));
  for (const weekStart of sortedWeeks) {
    items.push({
      id: `week-${weekStart}`,
      type: "report-week",
      label: formatWeekLabel(parseISO(weekStart), data.weekStartsOn),
      description: weekStart,
      weekStart,
      keywords: ["week", "report", "stats"],
    });
  }

  if (data.includeChat) {
    const sessions = data.chatSessions ?? [];
    const sessionTitleById = new Map(
      sessions.map((s) => [s.id, s.title?.trim() || "Chat"]),
    );

    for (const session of sessions) {
      items.push({
        id: `chat-session-${session.id}`,
        type: "chat-session",
        label: session.title?.trim() || "Chat",
        description: "Companion conversation",
        chatSessionId: session.id,
        keywords: ["chat", "companion", "ai"],
      });
    }

    const messages = [...(data.chatMessages ?? [])]
      .filter((m) => m.role === "user" || m.role === "assistant")
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, MAX_CHAT_MESSAGES_INDEXED);

    for (const message of messages) {
      const sessionLabel = sessionTitleById.get(message.sessionId) ?? "Chat";
      items.push({
        id: `chat-message-${message.id}`,
        type: "chat-message",
        label: truncateSnippet(message.content, 64),
        description: `${sessionLabel} · ${message.role}`,
        chatSessionId: message.sessionId,
        chatMessageId: message.id,
        keywords: [message.content, message.role, sessionLabel],
      });
    }
  }

  return items;
}

export function rankCommandItems(
  query: string,
  items: CommandItem[],
): CommandItem[] {
  const trimmed = query.trim();

  if (!trimmed) {
    const pages = items.filter((i) => i.type === "page");
    const recentDays = items
      .filter((i) => i.type === "board-day")
      .slice(0, 7);
    const chatSessions = items
      .filter((i) => i.type === "chat-session")
      .slice(0, 5);
    return [...pages, ...recentDays, ...chatSessions].slice(0, MAX_RESULTS);
  }

  const parsedDate = parseBoardDateQuery(trimmed);
  const scored: CommandItem[] = [];

  for (const item of items) {
    let score = scoreMatch(trimmed, searchableText(item), item.label);

    if (item.type === "task") {
      const haystack = [
        item.label,
        item.description ?? "",
        ...(item.keywords ?? []),
      ]
        .join(" ")
        .toLowerCase();
      if (haystack.includes(trimmed.toLowerCase())) {
        score = Math.max(score, 90);
      }
    }

    if (score > 0) {
      scored.push({ ...item, score });
    }
  }

  if (parsedDate) {
    const existing = scored.find(
      (i) => i.type === "board-day" && i.boardDate === parsedDate,
    );
    if (existing) {
      existing.score = 250;
    } else {
      scored.push({
        id: `board-day-parsed-${parsedDate}`,
        type: "board-day",
        label: formatBoardDayLabel(parsedDate),
        description: parsedDate,
        boardDate: parsedDate,
        score: 250,
      });
    }
  }

  scored.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

  const seen = new Set<string>();
  const unique: CommandItem[] = [];
  for (const item of scored) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    unique.push(item);
    if (unique.length >= MAX_RESULTS) break;
  }

  return unique;
}

export function groupCommandItems(
  items: CommandItem[],
): { type: CommandItemType; items: CommandItem[] }[] {
  const groups: { type: CommandItemType; items: CommandItem[] }[] = [];

  for (const type of COMMAND_GROUP_ORDER) {
    const groupItems = items.filter((i) => i.type === type);
    if (groupItems.length > 0) {
      groups.push({ type, items: groupItems });
    }
  }

  return groups;
}