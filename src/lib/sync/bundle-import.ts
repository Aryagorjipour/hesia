import { db } from "@/lib/db/schema";
import { HesiaExportBundleSchema } from "@/types/export";
import type { Task } from "@/types/task";
import type { Tag } from "@/types/tag";
import type { Category } from "@/types/category";
import type { ChatSession, ChatMessage } from "@/types/chat";
import type { SyncExportBundle } from "@/lib/sync/bundle-export";
import type { MergeStats, SyncTombstone } from "@/types/device-sync";

function isNewer(incoming?: string, existing?: string): boolean {
  if (!incoming) return true;
  if (!existing) return true;
  return Date.parse(incoming) >= Date.parse(existing);
}

async function mergeTasks(
  incoming: Task[],
  tombstones: SyncTombstone[],
  stats: MergeStats,
) {
  const tombstoned = new Set(
    tombstones.filter((t) => t.entityType === "task").map((t) => t.entityKey),
  );

  for (const key of tombstoned) {
    if (await db.tasks.get(key)) {
      await db.tasks.delete(key);
      stats.deleted += 1;
    }
  }

  for (const task of incoming) {
    if (tombstoned.has(task.id)) continue;
    const existing = await db.tasks.get(task.id);
    if (
      existing &&
      !isNewer(task.updatedAt ?? task.createdAt, existing.updatedAt ?? existing.createdAt)
    ) {
      stats.skipped += 1;
      continue;
    }
    await db.tasks.put({
      ...task,
      updatedAt: task.updatedAt ?? task.createdAt,
    });
    stats.updated += 1;
  }
}

async function mergeTags(
  incoming: Tag[],
  tombstones: SyncTombstone[],
  stats: MergeStats,
) {
  const tombstoned = new Set(
    tombstones.filter((t) => t.entityType === "tag").map((t) => t.entityKey),
  );

  for (const key of tombstoned) {
    if (await db.tags.get(key)) {
      await db.tags.delete(key);
      stats.deleted += 1;
    }
  }

  for (const tag of incoming) {
    if (tombstoned.has(tag.name)) continue;
    const existing = await db.tags.get(tag.name);
    if (existing && !isNewer(tag.updatedAt, existing.updatedAt)) {
      stats.skipped += 1;
      continue;
    }
    await db.tags.put(tag);
    stats.updated += 1;
  }
}

async function mergeCategories(
  incoming: Category[],
  tombstones: SyncTombstone[],
  stats: MergeStats,
) {
  const tombstoned = new Set(
    tombstones
      .filter((t) => t.entityType === "category")
      .map((t) => t.entityKey),
  );

  for (const key of tombstoned) {
    if (await db.categories.get(key)) {
      await db.categories.delete(key);
      stats.deleted += 1;
    }
  }

  for (const category of incoming) {
    if (tombstoned.has(category.name)) continue;
    const existing = await db.categories.get(category.name);
    if (existing && !isNewer(category.updatedAt, existing.updatedAt)) {
      stats.skipped += 1;
      continue;
    }
    await db.categories.put(category);
    stats.updated += 1;
  }
}

async function mergeChat(
  sessions: ChatSession[],
  messages: ChatMessage[],
  stats: MergeStats,
) {
  for (const session of sessions) {
    const existing = await db.chatSessions.get(session.id);
    if (!existing || isNewer(session.updatedAt, existing.updatedAt)) {
      await db.chatSessions.put(session);
      stats.updated += 1;
    } else {
      stats.skipped += 1;
    }
  }

  for (const message of messages) {
    const existing = await db.chatMessages.get(message.id);
    if (!existing || isNewer(message.createdAt, existing.createdAt)) {
      await db.chatMessages.put(message);
      stats.updated += 1;
    } else {
      stats.skipped += 1;
    }
  }
}

async function mergeSettings(bundle: SyncExportBundle) {
  const current = await db.settings.get("default");
  if (!current) return;
  const incoming = bundle.settings;
  await db.settings.put({
    ...current,
    profile: incoming.profile,
    zenPreset: incoming.zenPreset,
    presetWorkspaceConfigs: incoming.presetWorkspaceConfigs,
    weekStartsOn: incoming.weekStartsOn,
    theme: incoming.theme,
    columnNames: incoming.columnNames,
    notifications: incoming.notifications,
  });
}

export async function mergeSyncBundle(bundle: SyncExportBundle): Promise<MergeStats> {
  const parsed = HesiaExportBundleSchema.safeParse(bundle);
  if (!parsed.success) throw new Error("Invalid sync bundle");

  const stats: MergeStats = { updated: 0, skipped: 0, deleted: 0 };
  const tombstones = bundle.tombstones ?? [];

  await db.transaction(
    "rw",
    [
      db.tasks,
      db.tags,
      db.categories,
      db.weeklyReports,
      db.chatSessions,
      db.chatMessages,
      db.userMemory,
      db.settings,
      db.syncTombstones,
    ],
    async () => {
      await mergeTasks(bundle.tasks, tombstones, stats);
      await mergeTags(bundle.tags, tombstones, stats);
      await mergeCategories(bundle.categories, tombstones, stats);
      await mergeChat(bundle.chatSessions, bundle.chatMessages, stats);

      for (const report of bundle.weeklyReports) {
        const existing = await db.weeklyReports.get(report.id);
        if (
          !existing ||
          Date.parse(report.generatedAt) >= Date.parse(existing.generatedAt)
        ) {
          await db.weeklyReports.put(report);
          stats.updated += 1;
        } else {
          stats.skipped += 1;
        }
      }

      for (const entry of bundle.userMemory) {
        const existing = await db.userMemory.get(entry.id);
        if (!existing || isNewer(entry.updatedAt, existing.updatedAt)) {
          await db.userMemory.put(entry);
          stats.updated += 1;
        } else {
          stats.skipped += 1;
        }
      }

      for (const tombstone of tombstones) {
        const existing = await db.syncTombstones
          .where("entityKey")
          .equals(tombstone.entityKey)
          .filter((t) => t.entityType === tombstone.entityType)
          .first();
        if (!existing || isNewer(tombstone.deletedAt, existing.deletedAt)) {
          await db.syncTombstones.put(tombstone);
        }
      }

      await mergeSettings(bundle);
    },
  );

  return stats;
}