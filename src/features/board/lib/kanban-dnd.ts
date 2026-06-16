import { arrayMove } from "@dnd-kit/sortable";
import type { Task, TaskStatus } from "@/types/task";
import { DEFAULT_COLUMNS } from "@/types/task";
import { sortTasksByOrder } from "./filter-tasks";

export function getColumnTasks(tasks: Task[], status: TaskStatus): Task[] {
  return sortTasksByOrder(tasks.filter((t) => t.status === status));
}

export function findContainer(
  tasks: Task[],
  id: string,
): TaskStatus | undefined {
  if (DEFAULT_COLUMNS.includes(id as TaskStatus)) {
    return id as TaskStatus;
  }
  return tasks.find((t) => t.id === id)?.status;
}

/** Optimistically reorder tasks during drag — no DB writes. */
export function moveTaskInKanban(
  tasks: Task[],
  activeId: string,
  overId: string,
): Task[] | null {
  const activeTask = tasks.find((t) => t.id === activeId);
  if (!activeTask) return null;

  const activeContainer = activeTask.status;
  const overContainer = findContainer(tasks, overId);
  if (!overContainer) return null;

  if (activeContainer === overContainer) {
    const columnTasks = getColumnTasks(tasks, activeContainer);
    const oldIndex = columnTasks.findIndex((t) => t.id === activeId);
    const newIndex = columnTasks.findIndex((t) => t.id === overId);
    if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return null;

    const reordered = arrayMove(columnTasks, oldIndex, newIndex).map((t, i) => ({
      ...t,
      sortOrder: i,
    }));

    const others = tasks.filter((t) => t.status !== activeContainer);
    return [...others, ...reordered];
  }

  // Cross-column move
  const sourceTasks = getColumnTasks(tasks, activeContainer).filter(
    (t) => t.id !== activeId,
  );
  const destTasks = getColumnTasks(tasks, overContainer);

  let insertIndex = destTasks.length;
  if (!DEFAULT_COLUMNS.includes(overId as TaskStatus)) {
    const overIndex = destTasks.findIndex((t) => t.id === overId);
    if (overIndex >= 0) insertIndex = overIndex;
  }

  const movedTask: Task = {
    ...activeTask,
    status: overContainer,
    sortOrder: insertIndex,
    completedAt:
      overContainer === "done" && !activeTask.completedAt
        ? new Date().toISOString()
        : overContainer !== "done" && activeTask.status === "done"
          ? undefined
          : activeTask.completedAt,
  };

  const newDest = [...destTasks];
  newDest.splice(insertIndex, 0, movedTask);
  const normalizedDest = newDest.map((t, i) => ({ ...t, sortOrder: i }));
  const normalizedSource = sourceTasks.map((t, i) => ({ ...t, sortOrder: i }));

  const others = tasks.filter(
    (t) => t.status !== activeContainer && t.status !== overContainer,
  );

  return [...others, ...normalizedSource, ...normalizedDest];
}

export function tasksEqual(a: Task[], b: Task[]): boolean {
  if (a.length !== b.length) return false;
  const sortedA = [...a].sort((x, y) => x.id.localeCompare(y.id));
  const sortedB = [...b].sort((x, y) => x.id.localeCompare(y.id));
  return sortedA.every(
    (t, i) =>
      t.id === sortedB[i].id &&
      t.status === sortedB[i].status &&
      t.sortOrder === sortedB[i].sortOrder,
  );
}