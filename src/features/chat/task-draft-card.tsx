"use client";

import { useState } from "react";
import { LayoutGrid, Plus } from "lucide-react";
import { createTask } from "@/lib/db/mutations/tasks";
import type { AiTaskDraft } from "@/lib/ai/structured-output";
import { COLUMN_LABELS } from "@/types/task";
import { todayISO } from "@/lib/utils/board-dates";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

interface TaskDraftCardProps {
  draft: AiTaskDraft;
  className?: string;
}

export function TaskDraftCard({ draft, className }: TaskDraftCardProps) {
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);

  async function handleAdd() {
    if (added) return;
    setAdding(true);
    try {
      await createTask({
        title: draft.title,
        description: draft.description,
        status: draft.status === "archived" ? "todo" : draft.status,
        isPlanned: draft.isPlanned,
        tags: draft.tags,
        category: draft.category,
        durationMinutes: draft.durationMinutes,
        boardDate:
          draft.status === "inbox" ? undefined : todayISO(),
      });
      setAdded(true);
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