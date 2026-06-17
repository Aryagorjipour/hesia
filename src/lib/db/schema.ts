import Dexie, { type Table } from "dexie";
import { format, parseISO } from "date-fns";
import type { Task } from "@/types/task";
import type { Tag } from "@/types/tag";
import type { Category } from "@/types/category";
import type { WeeklyReport } from "@/types/report";
import type { ChatSession, ChatMessage } from "@/types/chat";
import type { AppSettings, UserMemoryEntry } from "@/types/settings";
import type { SyncTombstone } from "@/types/device-sync";

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
  syncTombstones!: Table<SyncTombstone, string>;

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

    this.version(3)
      .stores({
        tasks:
          "id, status, boardDate, isPlanned, category, createdAt, updatedAt, completedAt, sortOrder, *tags",
        tags: "name, updatedAt",
        categories: "name, updatedAt",
        weeklyReports: "id, weekStart, generatedAt",
        chatSessions: "id, updatedAt, weekStart",
        chatMessages: "id, sessionId, createdAt, role",
        userMemory: "id, updatedAt, type",
        settings: "id",
        deviceIdentity: "id, deviceId",
        trustedSenders: "deviceId, trustedAt",
        syncTombstones: "id, entityType, entityKey, deletedAt",
      })
      .upgrade(async (tx) => {
        const now = new Date().toISOString();
        await tx
          .table("tasks")
          .toCollection()
          .modify((task: Task) => {
            if (!task.updatedAt) task.updatedAt = task.createdAt;
          });
        await tx
          .table("tags")
          .toCollection()
          .modify((tag: Tag) => {
            if (!tag.updatedAt) tag.updatedAt = tag.lastUsedAt ?? now;
          });
        await tx
          .table("categories")
          .toCollection()
          .modify((category: Category) => {
            if (!category.updatedAt) category.updatedAt = now;
          });
      });

    this.version(4)
      .stores({
        tasks:
          "id, status, boardDate, isPlanned, category, createdAt, updatedAt, completedAt, sortOrder, *tags",
        tags: "name, updatedAt",
        categories: "name, updatedAt",
        weeklyReports: "id, weekStart, generatedAt",
        chatSessions: "id, updatedAt, weekStart",
        chatMessages: "id, sessionId, createdAt, role",
        userMemory: "id, updatedAt, type",
        settings: "id",
        syncTombstones: "id, entityType, entityKey, deletedAt",
      })
      .upgrade(async (tx) => {
        const settings = await tx.table("settings").get("default");
        if (settings) {
          const legacy = settings.p2pSync as
            | {
                enabled?: boolean;
                passwordVerifier?: { salt: string; hash: string };
                deviceLabel?: string;
                usePublicTurn?: boolean;
              }
            | undefined;
          const trustedRows = await tx.table("trustedSenders").toArray();
          const trustedDeviceIds = trustedRows.map(
            (row: { deviceId: string }) => row.deviceId,
          );
          await tx.table("settings").put({
            ...settings,
            deviceSync: legacy
              ? {
                  enabled: legacy.enabled ?? false,
                  passwordVerifier: legacy.passwordVerifier,
                  deviceLabel: legacy.deviceLabel,
                  trustedDeviceIds:
                    trustedDeviceIds.length > 0 ? trustedDeviceIds : undefined,
                }
              : settings.deviceSync,
            p2pSync: undefined,
          });
        }
        await tx.table("deviceIdentity").clear();
        await tx.table("trustedSenders").clear();
      });
  }
}

export const db = new HesiaDB();