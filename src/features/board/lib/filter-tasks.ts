import { parseISO, isWithinInterval, startOfDay, endOfDay } from "date-fns";
import type { Task, TaskStatus } from "@/types/task";
import type { PlannedFilter } from "@/stores/board-store";

export interface TaskFilters {
  searchQuery: string;
  selectedTags: string[];
  selectedCategory: string | null;
  plannedFilter: PlannedFilter;
  statusFilter: TaskStatus | "all";
  dateFrom: string | null;
  dateTo: string | null;
}

export function filterTasks(tasks: Task[], filters: TaskFilters): Task[] {
  const query = filters.searchQuery.trim().toLowerCase();

  return tasks.filter((task) => {
    if (query) {
      const haystack = [
        task.title,
        task.description ?? "",
        task.notes ?? "",
        task.category ?? "",
        ...task.tags,
      ]
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(query)) return false;
    }

    if (filters.selectedTags.length > 0) {
      if (!filters.selectedTags.every((tag) => task.tags.includes(tag))) {
        return false;
      }
    }

    if (filters.selectedCategory && task.category !== filters.selectedCategory) {
      return false;
    }

    if (filters.plannedFilter === "planned" && !task.isPlanned) return false;
    if (filters.plannedFilter === "unplanned" && task.isPlanned) return false;

    if (filters.statusFilter !== "all" && task.status !== filters.statusFilter) {
      return false;
    }

    if (filters.dateFrom || filters.dateTo) {
      const taskDate = parseISO(task.completedAt ?? task.createdAt);
      const from = filters.dateFrom
        ? startOfDay(parseISO(filters.dateFrom))
        : new Date(0);
      const to = filters.dateTo
        ? endOfDay(parseISO(filters.dateTo))
        : new Date(8640000000000000);
      if (!isWithinInterval(taskDate, { start: from, end: to })) return false;
    }

    return true;
  });
}

export function sortTasksByOrder(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => a.sortOrder - b.sortOrder);
}

export function groupTasksByStatus(
  tasks: Task[],
  columns: TaskStatus[],
): Record<TaskStatus, Task[]> {
  const sorted = sortTasksByOrder(tasks);
  return columns.reduce(
    (acc, status) => {
      acc[status] = sorted.filter((t) => t.status === status);
      return acc;
    },
    {} as Record<TaskStatus, Task[]>,
  );
}