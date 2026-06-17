import { format, parseISO } from "date-fns";
import type { Task } from "@/types/task";
import { todayISO } from "@/lib/utils/board-dates";

export function resolveTaskBoardDate(task: Task): string {
  if (task.status === "inbox") return todayISO();
  if (task.boardDate) return task.boardDate;
  if (task.startedOnBoardDate) return task.startedOnBoardDate;
  return format(parseISO(task.createdAt), "yyyy-MM-dd");
}