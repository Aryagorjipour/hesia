"use client";

import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Plus } from "lucide-react";
import type { Task, TaskStatus } from "@/types/task";
import type { Tag } from "@/types/tag";
import { TaskCard } from "./task-card";
import { cn } from "@/lib/utils/cn";

interface KanbanColumnProps {
  status: TaskStatus;
  label: string;
  tasks: Task[];
  tags: Tag[];
  canAdd: boolean;
  canDrag: boolean;
  onTaskClick: (taskId: string) => void;
  onAddClick: (status: TaskStatus) => void;
  isOver?: boolean;
  isDragging?: boolean;
  activeTaskId?: string;
}

export function KanbanColumn({
  status,
  label,
  tasks,
  tags,
  canAdd,
  canDrag,
  onTaskClick,
  onAddClick,
  isOver,
  isDragging,
  activeTaskId,
}: KanbanColumnProps) {
  const { setNodeRef, isOver: isDroppableOver } = useDroppable({
    id: status,
    data: { type: "column", status },
    disabled: !canDrag,
  });

  const highlighted = canDrag && (isOver || isDroppableOver);
  const isEmpty = tasks.length === 0;

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex h-full w-[min(88vw,20rem)] shrink-0 snap-start flex-col rounded-2xl bg-muted/20 transition-colors duration-200 sm:w-72",
        highlighted && "ring-2 ring-accent/30 bg-accent/5",
      )}
    >
      <div className="flex shrink-0 items-center justify-between gap-2 px-4 py-3">
        <h2 className="text-sm font-medium text-foreground">{label}</h2>
        <div className="flex items-center gap-1.5">
          {canAdd && (
            <button
              type="button"
              onClick={() => onAddClick(status)}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent/15 hover:text-accent active:scale-95"
              aria-label={`Add task to ${label}`}
            >
              <Plus className="h-4 w-4" strokeWidth={1.5} />
            </button>
          )}
          <span className="rounded-full bg-muted/60 px-2 py-0.5 text-xs text-muted-foreground">
            {tasks.length}
          </span>
        </div>
      </div>

      <SortableContext
        items={tasks.map((t) => t.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-3 pb-3">
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              tags={tags}
              canDrag={canDrag}
              onClick={() => onTaskClick(task.id)}
              isDragging={activeTaskId === task.id}
            />
          ))}
          {isEmpty && (
            <div
              className={cn(
                "flex min-h-[10rem] flex-1 items-center justify-center rounded-2xl border border-dashed transition-colors sm:min-h-[12rem]",
                isDragging && canDrag
                  ? "border-accent/40 bg-accent/5"
                  : "border-border/50",
              )}
            >
              {isDragging && canDrag ? (
                <p className="text-center text-xs text-muted-foreground">
                  Drop here
                </p>
              ) : canAdd ? (
                <button
                  type="button"
                  onClick={() => onAddClick(status)}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-muted/50 text-muted-foreground transition-all hover:bg-accent/15 hover:text-accent active:scale-95"
                  aria-label={`Add task to ${label}`}
                >
                  <Plus className="h-5 w-5" strokeWidth={1.5} />
                </button>
              ) : (
                <p className="text-center text-xs text-muted-foreground/60">
                  Empty
                </p>
              )}
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  );
}