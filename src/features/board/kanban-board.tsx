"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import type { Task, TaskStatus } from "@/types/task";
import type { Tag } from "@/types/tag";
import { DEFAULT_COLUMNS } from "@/types/task";
import type { BoardPermissions } from "@/lib/utils/board-dates";
import { KanbanColumn } from "./kanban-column";
import { TaskCard } from "./task-card";
import { syncKanbanTasks } from "@/lib/db/mutations/tasks";
import { groupTasksByStatus } from "./lib/filter-tasks";
import {
  moveTaskInKanban,
  tasksEqual,
} from "./lib/kanban-dnd";

interface KanbanBoardProps {
  tasks: Task[];
  tags: Tag[];
  columnLabels: Record<TaskStatus, string>;
  boardDate: string;
  permissions: BoardPermissions;
  onTaskClick: (taskId: string) => void;
  onAddToColumn: (status: TaskStatus) => void;
}

export function KanbanBoard({
  tasks,
  tags,
  columnLabels,
  boardDate,
  permissions,
  onTaskClick,
  onAddToColumn,
}: KanbanBoardProps) {
  const canDrag = permissions.canDrag;
  const [localTasks, setLocalTasks] = useState<Task[]>(tasks);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [overColumn, setOverColumn] = useState<TaskStatus | null>(null);
  const isDraggingRef = useRef(false);
  const pendingPersistRef = useRef<Task[] | null>(null);

  useEffect(() => {
    if (isDraggingRef.current) return;
    if (pendingPersistRef.current) {
      if (tasksEqual(tasks, pendingPersistRef.current)) {
        pendingPersistRef.current = null;
        setLocalTasks(tasks);
      }
      return;
    }
    setLocalTasks(tasks);
  }, [tasks]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      if (!canDrag) return;
      isDraggingRef.current = true;
      const task = event.active.data.current?.task as Task | undefined;
      if (task) setActiveTask(task);
    },
    [canDrag],
  );

  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      if (!canDrag) return;
      const { active, over } = event;
      if (!over) {
        setOverColumn(null);
        return;
      }

      const overId = String(over.id);
      if (DEFAULT_COLUMNS.includes(overId as TaskStatus)) {
        setOverColumn(overId as TaskStatus);
      } else {
        const overTask = over.data.current?.task as Task | undefined;
        if (overTask) setOverColumn(overTask.status);
      }

      if (active.id === over.id) return;

      setLocalTasks((prev) => {
        const next = moveTaskInKanban(prev, String(active.id), overId);
        return next ?? prev;
      });
    },
    [canDrag],
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      if (!canDrag) return;
      const { active, over } = event;

      isDraggingRef.current = false;
      setOverColumn(null);

      requestAnimationFrame(() => {
        setActiveTask(null);
      });

      if (!over) return;

      setLocalTasks((prev) => {
        let final = prev;
        if (active.id !== over.id) {
          const next = moveTaskInKanban(prev, String(active.id), String(over.id));
          if (next) final = next;
        }
        pendingPersistRef.current = final;
        void syncKanbanTasks(final, boardDate).catch(console.error);
        return final;
      });
    },
    [canDrag, boardDate],
  );

  const handleDragCancel = useCallback(() => {
    isDraggingRef.current = false;
    setActiveTask(null);
    setOverColumn(null);
    setLocalTasks(tasks);
    pendingPersistRef.current = null;
  }, [tasks]);

  const tasksByStatus = groupTasksByStatus(localTasks, DEFAULT_COLUMNS);

  const columns = (
    <div className="flex-1 overflow-x-auto overscroll-x-contain scroll-smooth px-3 py-3 sm:px-4 sm:py-4 lg:px-6">
      <div className="mx-auto flex h-full min-h-[calc(100dvh-13rem)] w-max items-stretch gap-3 snap-x snap-mandatory sm:min-h-[calc(100dvh-12rem)] sm:gap-4">
        {DEFAULT_COLUMNS.map((status) => (
          <KanbanColumn
            key={status}
            status={status}
            label={columnLabels[status]}
            tasks={tasksByStatus[status]}
            tags={tags}
            canAdd={permissions.canAdd(status)}
            canDrag={canDrag}
            onTaskClick={onTaskClick}
            onAddClick={onAddToColumn}
            isOver={overColumn === status}
            isDragging={activeTask !== null}
            activeTaskId={activeTask?.id}
          />
        ))}
      </div>
    </div>
  );

  const board = (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      {columns}
    </div>
  );

  if (!canDrag) {
    return board;
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      {columns}

      <DragOverlay
        dropAnimation={{
          duration: 250,
          easing: "cubic-bezier(0.18, 0.67, 0.6, 1)",
        }}
      >
        {activeTask ? (
          <TaskCard
            task={activeTask}
            tags={tags}
            onClick={() => {}}
            isDragOverlay
          />
        ) : null}
      </DragOverlay>
    </DndContext>
    </div>
  );
}