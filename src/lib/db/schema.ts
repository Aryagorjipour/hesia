import Dexie, { type Table } from "dexie";
import { format, parseISO } from "date-fns";
import type { Task } from "@/types/task";
import type { Tag } from "@/types/tag";
import type { Category } from "@/types/category";
import type { WeeklyReport } from "@/types/report";
import type { ChatSession, ChatMessage } from "@/types/chat";
import type { AppSettings, UserMemoryEntry } from "@/types/settings";

/**
 * Hesia IndexedDB schema — all app data lives here permanently.
 * Version bumps add migrations in migrations.ts.
 */
export class HesiaDB extends Dexie {
  tasks!: Table<Task, string>;
  tags!: Table<Tag, string>;
  categories!: Table<Category, string>;
  weeklyReports!: Table<WeeklyReport, string>;
  chatSessions!: Table<ChatSession, string>;
  chatMessages!: Table<ChatMessage, string>;
  userMemory!: Table<UserMemoryEntry, string>;
  settings!: Table<AppSettings, string>;

  constructor() {
    super("hesia");

    this.version(1).stores({
      tasks:
        "id, status, isPlanned, category, createdAt, completedAt, sortOrder, *tags",
      tags: "name",
      categories: "name",
      weeklyReports: "id, weekStart, generatedAt",
      chatSessions: "id, updatedAt, weekStart",
      chatMessages: "id, sessionId, createdAt, role",
      userMemory: "id, updatedAt, type",
      settings: "id",
    });

    this.version(2)
      .stores({
        tasks:
          "id, status, boardDate, isPlanned, category, createdAt, completedAt, sortOrder, *tags",
        tags: "name",
        categories: "name",
        weeklyReports: "id, weekStart, generatedAt",
        chatSessions: "id, updatedAt, weekStart",
        chatMessages: "id, sessionId, createdAt, role",
        userMemory: "id, updatedAt, type",
        settings: "id",
      })
      .upgrade(async (tx) => {
        await tx
          .table("tasks")
          .toCollection()
          .modify((task: Task) => {
            if (task.status !== "inbox" && !task.boardDate) {
              const day = format(parseISO(task.createdAt), "yyyy-MM-dd");
              task.boardDate = day;
              if (task.status === "todo" || task.status === "doing") {
                task.startedOnBoardDate = day;
              }
            }
          });
      });
  }
}

export const db = new HesiaDB();