"use client";

import { useState } from "react";
import { LayoutGrid, Plus } from "lucide-react";
import { addTaskDraftToBoard } from "@/lib/chat/task-draft-actions";
import type { AiTaskDraft } from "@/lib/ai/structured-output";
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

  const status = onStatusChange ? persistedStatus : localStatus;
  const added = status === "added";
  const dismissed = status === "dismissed";

  if (dismissed) return null;

  async function handleAdd() {
    if (added) return;
    setAdding(true);
    try {
      await addTaskDraftToBoard(draft);
      if (onStatusChange) {
        await onStatusChange("added");
      } else {
        setLocalStatus("added");
      }
    } finally {
      setAdding(false);
    }
  }

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
          <p className="text-sm font-medium text-foreground">{draft.title}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {COLUMN_LABELS[draft.status]} ·{" "}
            {draft.isPlanned ? "Planned" : "Flow win"}
            {draft.category ? ` · ${draft.category}` : ""}
          </p>
        </div>
      </div>
      <Button
        size="sm"
        variant={added ? "ghost" : "secondary"}
        className="mt-2 w-full gap-1.5"
        onClick={() => void handleAdd()}
        disabled={adding || added}
      >
        <Plus className="h-3.5 w-3.5" />
        {added ? "Added to board" : adding ? "Adding…" : "Add to board"}
      </Button>
    </div>
  );
}