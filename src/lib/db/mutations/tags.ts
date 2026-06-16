import { db } from "../schema";
import { toISO } from "@/lib/utils/dates";
import type { Tag } from "@/types/tag";

export async function createTag(
  name: string,
  colorHex = "#71717a",
): Promise<Tag> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Tag name is required");

  const existing = await db.tags.get(trimmed);
  if (existing) return existing;

  const tag: Tag = {
    name: trimmed,
    colorHex,
    usageCount: 0,
  };
  await db.tags.put(tag);
  return tag;
}

export async function updateTag(
  name: string,
  updates: Partial<Pick<Tag, "colorHex">>,
): Promise<void> {
  const existing = await db.tags.get(name);
  if (!existing) return;
  await db.tags.update(name, updates);
}

export async function renameTag(
  oldName: string,
  newName: string,
): Promise<void> {
  const trimmed = newName.trim();
  if (!trimmed || oldName === trimmed) return;

  const existing = await db.tags.get(oldName);
  if (!existing) return;

  const target = await db.tags.get(trimmed);
  if (target && target.name !== oldName) {
    throw new Error(`Tag "${trimmed}" already exists`);
  }

  await db.transaction("rw", db.tasks, db.tags, async () => {
    const tasks = await db.tasks.filter((t) => t.tags.includes(oldName)).toArray();
    for (const task of tasks) {
      await db.tasks.update(task.id, {
        tags: task.tags.map((t) => (t === oldName ? trimmed : t)),
      });
    }

    await db.tags.delete(oldName);
    await db.tags.put({
      ...existing,
      name: trimmed,
      usageCount: tasks.length,
      lastUsedAt: tasks.length > 0 ? toISO(new Date()) : existing.lastUsedAt,
    });
  });
}

export async function mergeTags(
  sourceName: string,
  targetName: string,
): Promise<void> {
  const trimmedTarget = targetName.trim();
  if (!trimmedTarget || sourceName === trimmedTarget) return;
  await renameTag(sourceName, trimmedTarget);
}

export async function deleteTag(name: string): Promise<void> {
  await db.transaction("rw", db.tasks, db.tags, async () => {
    const tasks = await db.tasks.filter((t) => t.tags.includes(name)).toArray();
    for (const task of tasks) {
      await db.tasks.update(task.id, {
        tags: task.tags.filter((t) => t !== name),
      });
    }
    await db.tags.delete(name);
  });
}