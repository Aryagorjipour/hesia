import type { Task } from "@/types/task";

/** Inbox is global; all other columns belong to the selected board day. */
export function filterTasksForBoardDay(
  tasks: Task[],
  boardDate: string,
): Task[] {
  return tasks.filter((task) => {
    if (task.status === "inbox") return true;
    return task.boardDate === boardDate;
  });
}

export function countCarryForwardCandidates(
  tasks: Task[],
  boardDate: string,
): number {
  return tasks.filter(
    (t) =>
      t.boardDate === boardDate &&
      (t.status === "todo" || t.status === "doing"),
  ).length;
}