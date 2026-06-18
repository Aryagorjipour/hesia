"use client";

import { useState } from "react";
import { ChevronDown, LayoutGrid, Plus } from "lucide-react";
import {
  addTaskSuggestionToBoard,
  taskSuggestionFromDraft,
  type TaskSuggestionFields,
} from "@/lib/chat/task-suggestion";
import type { AiTaskDraft } from "@/lib/ai/structured-output";
import { TaskSuggestionFieldsEditor } from "@/features/chat/task-suggestion-fields";
import { COLUMN_LABELS } from "@/types/task";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

export type TaskDraftCardStatus = "pending" | "added" | "dismissed";

interface TaskDraftCardProps {
  draft: AiTaskDraft;
  className?: string;
  status?: TaskDraftCardStatus;
  onStatusChange?: (status: "added" | "dismissed") => void | Promise<void>;
}

export function TaskDraftCard({
  draft,
  className,
  status: persistedStatus = "pending",
  onStatusChange,
}: TaskDraftCardProps) {
  const [adding, setAdding] = useState(false);
  const [localStatus, setLocalStatus] = useState<TaskDraftCardStatus>("pending");
  const [showEdit, setShowEdit] = useState(false);
  const [fields, setFields] = useState<TaskSuggestionFields>(() =>
    taskSuggestionFromDraft(draft),
  );

  const status = onStatusChange ? persistedStatus : localStatus;
  const added = status === "added";
  const dismissed = status === "dismissed";

  if (dismissed) return null;

  async function handleAdd() {
    if (added || !fields.title.trim()) return;
    setAdding(true);
    try {
      await addTaskSuggestionToBoard(fields);
      if (onStatusChange) {
        await onStatusChange("added");
      } else {
        setLocalStatus("added");
      }
    } finally {
      setAdding(false);
    }
  }

  const summaryParts = [
    COLUMN_LABELS[fields.status],
    fields.isPlanned ? "Planned" : "Flow win",
  ];
  if (fields.category) summaryParts.push(fields.category);
  if (fields.durationMinutes) summaryParts.push(`${fields.durationMinutes} min`);

  return (
    <div
      className={cn(
        "mt-3 rounded-2xl border border-border/60 bg-card/80 p-3",
        className,
      )}
    >
      <div className="flex items-start gap-2">
        <LayoutGrid className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground">{fields.title}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {summaryParts.join(" · ")}
          </p>
        </div>
      </div>

      {!added && (
        <>
          <button
            type="button"
            onClick={() => setShowEdit((v) => !v)}
            className="mt-2 flex w-full items-center justify-between rounded-lg px-1 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            <span>Edit tags, category & details</span>
            <ChevronDown
              className={cn(
                "h-3.5 w-3.5 transition-transform",
                showEdit && "rotate-180",
              )}
            />
          </button>
          {showEdit && (
            <TaskSuggestionFieldsEditor
              value={fields}
              onChange={setFields}
              disabled={adding}
            />
          )}
        </>
      )}

      <Button
        size="sm"
        variant={added ? "ghost" : "secondary"}
        className="mt-2 w-full gap-1.5"
        onClick={() => void handleAdd()}
        disabled={adding || added || !fields.title.trim()}
      >
        <Plus className="h-3.5 w-3.5" />
        {added ? "Added to board" : adding ? "Adding…" : "Add to board"}
      </Button>
    </div>
  );
}