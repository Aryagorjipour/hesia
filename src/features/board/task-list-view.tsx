"use client";

import { formatDistanceToNow, parseISO } from "date-fns";
import { Clock } from "lucide-react";
import type { Task } from "@/types/task";
import type { Tag } from "@/types/tag";
import { COLUMN_LABELS } from "@/types/task";
import { TagChip } from "@/components/ui/tag-chip";
import { cn } from "@/lib/utils/cn";

interface TaskListViewProps {
  tasks: Task[];
  tags: Tag[];
  onTaskClick: (taskId: string) => void;
}

export function TaskListView({ tasks, tags, onTaskClick }: TaskListViewProps) {
  const tagMap = Object.fromEntries(tags.map((t) => [t.name, t]));

  if (tasks.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <p className="text-sm text-muted-foreground">No tasks match your filters.</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-4 sm:p-6 lg:p-8">
      {tasks.map((task) => (
        <button
          key={task.id}
          type="button"
          onClick={() => onTaskClick(task.id)}
          className="flex w-full items-start gap-4 rounded-2xl border border-border/60 bg-card/80 p-4 text-left transition-colors hover:bg-muted/30"
        >
          <div
            className="mt-1 h-10 w-1 shrink-0 rounded-full"
            style={{
              backgroundColor: task.isPlanned
                ? "var(--planned)"
                : "var(--unplanned)",
            }}
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-4">
              <p className="text-sm font-medium text-foreground">{task.title}</p>
              <span className="shrink-0 text-xs text-muted-foreground">
                {COLUMN_LABELS[task.status]}
              </span>
            </div>
            {task.description && (
              <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                {task.description}
              </p>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {task.category && (
                <span className="text-xs text-muted-foreground">{task.category}</span>
              )}
              {task.durationMinutes && (
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {task.durationMinutes}m
                </span>
              )}
              <span className="text-xs text-muted-foreground/70">
                {formatDistanceToNow(
                  parseISO(task.completedAt ?? task.createdAt),
                  { addSuffix: true },
                )}
              </span>
            </div>
            {task.tags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {task.tags.map((tagName) => (
                  <TagChip
                    key={tagName}
                    name={tagName}
                    colorHex={tagMap[tagName]?.colorHex}
                  />
                ))}
              </div>
            )}
          </div>
          <span
            className={cn(
              "shrink-0 rounded-full px-2 py-0.5 text-xs",
              task.isPlanned
                ? "bg-planned/15 text-planned"
                : "bg-unplanned/15 text-unplanned",
            )}
          >
            {task.isPlanned ? "Planned" : "Flow"}
          </span>
        </button>
      ))}
    </div>
  );
}