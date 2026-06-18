import type { Task } from "@/types/task";

function normalize(value: string): string {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

export function findTaskForBulkUpdate(
  tasks: Task[],
  taskId?: string,
  titleMatch?: string,
): Task | undefined {
  if (taskId) {
    return tasks.find((t) => t.id === taskId);
  }

  const needle = normalize(titleMatch ?? "");
  if (!needle) return undefined;

  const active = tasks.filter((t) => t.status !== "archived");

  const exact = active.find((t) => normalize(t.title) === needle);
  if (exact) return exact;

  const contains = active.find((t) => normalize(t.title).includes(needle));
  if (contains) return contains;

  return active.find((t) => needle.includes(normalize(t.title)));
}