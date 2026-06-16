import { v4 as uuidv4 } from "uuid";
import { db } from "../schema";
import { toISO } from "@/lib/utils/dates";
import { nextBoardDate } from "@/lib/utils/board-dates";
import type { Task, TaskStatus, DayTransition } from "@/types/task";
import { DEFAULT_COLUMNS } from "@/types/task";
import { getColumnTasks } from "@/features/board/lib/kanban-dnd";

async function recomputeTagUsage(tagNames: string[]): Promise<void> {
  const now = toISO(new Date());
  for (const name of tagNames) {
    const count = await db.tasks
      .filter((t) => t.tags.includes(name))
      .count();
    const existing = await db.tags.get(name);
    if (existing) {
      await db.tags.update(name, { usageCount: count, lastUsedAt: now });
    } else if (count > 0) {
      await db.tags.put({
        name,
        colorHex: "#71717a",
        usageCount: count,
        lastUsedAt: now,
      });
    }
  }
}

async function recomputeCategoryUsage(categoryName: string | undefined): Promise<void> {
  if (!categoryName) return;
  const count = await db.tasks.filter((t) => t.category === categoryName).count();
  const existing = await db.categories.get(categoryName);
  if (existing) {
    await db.categories.update(categoryName, { usageCount: count });
  } else if (count > 0) {
    await db.categories.put({ name: categoryName, usageCount: count });
  }
}

export async function getNextSortOrder(
  status: TaskStatus,
  boardDate?: string,
): Promise<number> {
  let tasks: Task[];
  if (status === "inbox") {
    tasks = await db.tasks.where("status").equals("inbox").toArray();
  } else {
    tasks = await db.tasks
      .filter((t) => t.status === status && t.boardDate === boardDate)
      .toArray();
  }
  if (tasks.length === 0) return 0;
  return Math.max(...tasks.map((t) => t.sortOrder)) + 1;
}

export async function createTask(
  input: Omit<Task, "id" | "createdAt" | "sortOrder"> & {
    sortOrder?: number;
    boardDate?: string;
  },
): Promise<Task> {
  const boardDate = input.status === "inbox" ? undefined : input.boardDate;
  const sortOrder =
    input.sortOrder ?? (await getNextSortOrder(input.status, boardDate));

  const task: Task = {
    ...input,
    id: uuidv4(),
    createdAt: toISO(new Date()),
    sortOrder,
    boardDate,
    startedOnBoardDate:
      input.startedOnBoardDate ??
      (boardDate && (input.status === "todo" || input.status === "doing")
        ? boardDate
        : undefined),
  };

  await db.tasks.add(task);
  await recomputeTagUsage(task.tags);
  if (task.category) await recomputeCategoryUsage(task.category);
  return task;
}

export async function updateTask(
  id: string,
  updates: Partial<Omit<Task, "id" | "createdAt">>,
): Promise<void> {
  const existing = await db.tasks.get(id);
  if (!existing) return;

  const updated = { ...existing, ...updates };

  if (updates.status === "done" && !updated.completedAt) {
    updated.completedAt = toISO(new Date());
  }
  if (updates.status && updates.status !== "done" && existing.status === "done") {
    updated.completedAt = undefined;
  }

  if (updates.status === "inbox") {
    updated.boardDate = undefined;
  } else if (updates.status && !updated.boardDate) {
    updated.boardDate = existing.boardDate;
  }

  if (
    updates.status &&
    (updates.status === "todo" || updates.status === "doing") &&
    !updated.startedOnBoardDate &&
    updated.boardDate
  ) {
    updated.startedOnBoardDate = updated.boardDate;
  }

  await db.tasks.put(updated);

  const allTags = [...new Set([...existing.tags, ...updated.tags])];
  await recomputeTagUsage(allTags);

  const categories = [existing.category, updated.category].filter(Boolean) as string[];
  for (const cat of categories) await recomputeCategoryUsage(cat);
}

export async function deleteTask(id: string): Promise<void> {
  const existing = await db.tasks.get(id);
  if (!existing) return;
  await db.tasks.delete(id);
  await recomputeTagUsage(existing.tags);
  if (existing.category) await recomputeCategoryUsage(existing.category);
}

export async function carryTaskToNextDay(taskId: string): Promise<void> {
  const task = await db.tasks.get(taskId);
  if (!task?.boardDate) return;
  if (task.status !== "todo" && task.status !== "doing") return;

  const toDate = nextBoardDate(task.boardDate);
  const transition: DayTransition = {
    fromBoardDate: task.boardDate,
    toBoardDate: toDate,
    fromStatus: task.status,
    toStatus: task.status,
    at: toISO(new Date()),
    reason: "carry_forward",
  };

  const sortOrder = await getNextSortOrder(task.status, toDate);

  await db.tasks.update(taskId, {
    boardDate: toDate,
    sortOrder,
    startedOnBoardDate: task.startedOnBoardDate ?? task.boardDate,
    dayTransitions: [...(task.dayTransitions ?? []), transition],
  });
}

/** Revert the most recent carry-forward transition. */
export async function undoLastDayTransition(taskId: string): Promise<boolean> {
  const task = await db.tasks.get(taskId);
  if (!task?.dayTransitions?.length || !task.boardDate) return false;

  const transitions = [...task.dayTransitions];
  const last = transitions[transitions.length - 1];
  if (last.reason !== "carry_forward") return false;

  transitions.pop();
  const sortOrder = await getNextSortOrder(last.fromStatus, last.fromBoardDate);

  await db.tasks.update(taskId, {
    boardDate: last.fromBoardDate,
    status: last.fromStatus,
    sortOrder,
    dayTransitions: transitions.length > 0 ? transitions : undefined,
  });

  return true;
}

export async function carryAllIncompleteToNextDay(
  boardDate: string,
): Promise<number> {
  const tasks = await db.tasks
    .filter(
      (t) =>
        t.boardDate === boardDate &&
        (t.status === "todo" || t.status === "doing"),
    )
    .toArray();

  for (const task of tasks) {
    await carryTaskToNextDay(task.id);
  }
  return tasks.length;
}

/** Bulk-sync kanban state after optimistic DnD — single transaction. */
export async function syncKanbanTasks(
  tasks: Task[],
  boardDate: string,
): Promise<void> {
  await db.transaction("rw", db.tasks, async () => {
    for (const status of DEFAULT_COLUMNS) {
      const columnTasks = getColumnTasks(tasks, status);
      for (let i = 0; i < columnTasks.length; i++) {
        const t = columnTasks[i];
        const boardPatch =
          status === "inbox"
            ? { boardDate: undefined }
            : { boardDate: t.boardDate ?? boardDate };

        const startedPatch =
          (status === "todo" || status === "doing") && boardPatch.boardDate
            ? {
                startedOnBoardDate:
                  t.startedOnBoardDate ?? boardPatch.boardDate,
              }
            : {};

        await db.tasks.put({
          ...t,
          status,
          sortOrder: i,
          ...boardPatch,
          ...startedPatch,
        });
      }
    }
  });
}

export async function ensureTagExists(name: string, colorHex = "#71717a"): Promise<void> {
  const existing = await db.tags.get(name);
  if (!existing) {
    await db.tags.put({ name, colorHex, usageCount: 0 });
  }
}

export async function ensureCategoryExists(name: string): Promise<void> {
  const existing = await db.categories.get(name);
  if (!existing) {
    await db.categories.put({ name, usageCount: 0 });
  }
}