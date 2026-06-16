"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { formatDistanceToNow, parseISO } from "date-fns";
import { Clock } from "lucide-react";
import type { Task } from "@/types/task";
import type { Tag } from "@/types/tag";
import { TagChip } from "@/components/ui/tag-chip";
import { cn } from "@/lib/utils/cn";

interface TaskCardProps {
  task: Task;
  tags: Tag[];
  onClick: () => void;
  canDrag?: boolean;
  isDragOverlay?: boolean;
  isDragging?: boolean;
}

export function TaskCard({
  task,
  tags,
  onClick,
  canDrag = true,
  isDragOverlay,
  isDragging: isDraggingProp,
}: TaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    data: { type: "task", task },
    disabled: !canDrag,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const tagMap = Object.fromEntries(tags.map((t) => [t.name, t]));
  const timeLabel = task.completedAt
    ? formatDistanceToNow(parseISO(task.completedAt), { addSuffix: true })
    : formatDistanceToNow(parseISO(task.createdAt), { addSuffix: true });

  const content = (
    <div
      className={cn(
        "relative flex gap-3 rounded-2xl border border-border/60 bg-card/90 p-4 shadow-sm transition-shadow",
        (isDragging || isDraggingProp) && !isDragOverlay && "opacity-0",
        isDragOverlay && "scale-[1.02] shadow-lg ring-2 ring-accent/30",
        !isDragOverlay && "hover:shadow-md",
      )}
    >
      <div
        className="w-1 shrink-0 self-stretch rounded-full"
        style={{
          backgroundColor: task.isPlanned
            ? "var(--planned)"
            : "var(--unplanned)",
        }}
      />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium leading-snug text-foreground">
          {task.title}
        </p>
        {task.description && (
          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
            {task.description}
          </p>
        )}
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {task.category && (
            <span className="rounded-full bg-muted/60 px-2 py-0.5 text-xs text-muted-foreground">
              {task.category}
            </span>
          )}
          {task.durationMinutes && (
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              {task.durationMinutes}m
            </span>
          )}
        </div>
        {task.tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {task.tags.slice(0, 4).map((tagName) => (
              <TagChip
                key={tagName}
                name={tagName}
                colorHex={tagMap[tagName]?.colorHex}
              />
            ))}
          </div>
        )}
        <p className="mt-2 text-xs text-muted-foreground/70">{timeLabel}</p>
      </div>
    </div>
  );

  if (isDragOverlay) return content;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "touch-manipulation",
        canDrag ? "cursor-grab active:cursor-grabbing" : "cursor-pointer",
      )}
      {...attributes}
      {...listeners}
      onClick={onClick}
    >
      {content}
    </div>
  );
}