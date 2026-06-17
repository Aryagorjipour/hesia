import { db } from "../schema";
import { recordTombstone } from "@/lib/db/tombstones";
import { syncNow } from "@/lib/utils/sync-timestamp";
import type { Category } from "@/types/category";

export async function createCategory(
  name: string,
  colorHex?: string,
): Promise<Category> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Category name is required");

  const existing = await db.categories.get(trimmed);
  if (existing) return existing;

  const category: Category = {
    name: trimmed,
    colorHex,
    usageCount: 0,
    updatedAt: syncNow(),
  };
  await db.categories.put(category);
  return category;
}

export async function updateCategory(
  name: string,
  updates: Partial<Pick<Category, "colorHex" | "description" | "iconName">>,
): Promise<void> {
  const existing = await db.categories.get(name);
  if (!existing) {
    throw new Error(`Category "${name}" not found`);
  }
  await db.categories.put({
    ...existing,
    ...updates,
    updatedAt: syncNow(),
  });
}

export async function renameCategory(
  oldName: string,
  newName: string,
): Promise<void> {
  const trimmed = newName.trim();
  if (!trimmed || oldName === trimmed) return;

  const existing = await db.categories.get(oldName);
  if (!existing) {
    throw new Error(`Category "${oldName}" not found`);
  }

  const target = await db.categories.get(trimmed);
  if (target && target.name !== oldName) {
    throw new Error(`Category "${trimmed}" already exists`);
  }

  await db.transaction("rw", db.tasks, db.categories, db.syncTombstones, async () => {
    const tasks = await db.tasks
      .filter((t) => t.category === oldName)
      .toArray();

    const now = syncNow();
    for (const task of tasks) {
      await db.tasks.update(task.id, { category: trimmed, updatedAt: now });
    }

    await recordTombstone("category", oldName);
    await db.categories.delete(oldName);
    await db.categories.put({
      ...existing,
      name: trimmed,
      usageCount: tasks.length,
      updatedAt: now,
    });
  });
}

export async function deleteCategory(name: string): Promise<void> {
  const existing = await db.categories.get(name);
  if (!existing) {
    throw new Error(`Category "${name}" not found`);
  }

  await db.transaction("rw", db.tasks, db.categories, db.syncTombstones, async () => {
    const tasks = await db.tasks.filter((t) => t.category === name).toArray();
    const now = syncNow();
    for (const task of tasks) {
      await db.tasks.update(task.id, { category: undefined, updatedAt: now });
    }
    await recordTombstone("category", name);
    await db.categories.delete(name);
  });
}