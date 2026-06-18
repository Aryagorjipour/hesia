"use client";

import { useState } from "react";
import {
  Calendar,
  Check,
  ChevronDown,
  LayoutGrid,
  Mail,
  X,
} from "lucide-react";
import {
  buildActionPreview,
  executeConfirmedAction,
} from "@/lib/ai/action-executor";
import {
  addTaskSuggestionToBoard,
  taskSuggestionFromCreateTaskPayload,
} from "@/lib/chat/task-suggestion";
import type { TaskSuggestionFields } from "@/lib/chat/task-suggestion";
import { TaskSuggestionFieldsEditor } from "@/features/chat/task-suggestion-fields";
import type { CreateTaskAction, HesiaAction } from "@/types/ai-actions";
import { COLUMN_LABELS } from "@/types/task";
import { toast } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

export type ActionCardStatus = "pending" | "completed" | "dismissed";

interface ActionPreviewCardProps {
  action: HesiaAction;
  className?: string;
  status?: ActionCardStatus;
  onStatusChange?: (status: "completed" | "dismissed") => void | Promise<void>;
}

const ACTION_ICONS = {
  create_task: LayoutGrid,
  draft_report_email: Mail,
  create_calendar_event: Calendar,
} as const;

export function ActionPreviewCard({
  action,
  className,
  status: persistedStatus = "pending",
  onStatusChange,
}: ActionPreviewCardProps) {
  const preview = buildActionPreview(action);
  const Icon = ACTION_ICONS[action.type];
  const isCreateTask = action.type === "create_task";
  const [executing, setExecuting] = useState(false);
  const [localStatus, setLocalStatus] = useState<ActionCardStatus>("pending");
  const [showEdit, setShowEdit] = useState(false);
  const [taskFields, setTaskFields] = useState<TaskSuggestionFields | null>(
    () =>
      isCreateTask
        ? taskSuggestionFromCreateTaskPayload(
            (action as CreateTaskAction).payload,
          )
        : null,
  );

  const status = onStatusChange ? persistedStatus : localStatus;
  const completed = status === "completed";
  const dismissed = status === "dismissed";

  if (dismissed) return null;

  async function handleConfirm() {
    if (completed) return;

    setExecuting(true);
    try {
      if (isCreateTask && taskFields) {
        if (!taskFields.title.trim()) {
          toast.warning({
            title: "Title required",
            description: "Give the task a title before adding it.",
          });
          return;
        }
        await addTaskSuggestionToBoard(taskFields);
        if (onStatusChange) {
          await onStatusChange("completed");
        } else {
          setLocalStatus("completed");
        }
        toast.success({
          title: "Done",
          description: "Task added to your board",
        });
        return;
      }

      const result = await executeConfirmedAction(action);
      if (result.ok) {
        if (onStatusChange) {
          await onStatusChange("completed");
        } else {
          setLocalStatus("completed");
        }
        toast.success({
          title: "Done",
          description: result.message,
        });
      } else {
        toast.error({
          title: "Action failed",
          description: result.message,
        });
      }
    } finally {
      setExecuting(false);
    }
  }

  async function handleDismiss() {
    if (onStatusChange) {
      await onStatusChange("dismissed");
    } else {
      setLocalStatus("dismissed");
    }
  }

  const doneLabel =
    action.type === "create_task" ? "Added to board" : "Done";

  const taskSummary =
    isCreateTask && taskFields
      ? [
          COLUMN_LABELS[taskFields.status],
          taskFields.isPlanned ? "Planned" : "Flow win",
          taskFields.category,
          taskFields.durationMinutes
            ? `${taskFields.durationMinutes} min`
            : undefined,
        ]
          .filter(Boolean)
          .join(" · ")
      : null;

  return (
    <div
      className={cn(
        "mt-3 rounded-2xl border border-border/60 bg-card/80 p-3",
        className,
      )}
    >
      <div className="flex items-start gap-2">
        <Icon className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground">
            {isCreateTask && taskFields ? taskFields.title : preview.title}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {isCreateTask && taskSummary ? taskSummary : preview.summary}
          </p>
        </div>
      </div>

      {!isCreateTask && (
        <div className="mt-2 space-y-1 rounded-xl bg-muted/20 px-3 py-2">
          {preview.detailLines.map((line, index) =>
            line ? (
              <p
                key={`${line.slice(0, 24)}-${index}`}
                className={cn(
                  "text-xs text-muted-foreground",
                  index > 0 &&
                    preview.detailLines[index - 1] === "" &&
                    "whitespace-pre-wrap text-foreground/80",
                )}
              >
                {line}
              </p>
            ) : null,
          )}
        </div>
      )}

      {isCreateTask && taskFields && !completed && (
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
              value={taskFields}
              onChange={setTaskFields}
              disabled={executing}
            />
          )}
        </>
      )}

      <div className="mt-3 flex gap-2">
        <Button
          size="sm"
          variant={completed ? "ghost" : "secondary"}
          className="flex-1 gap-1.5"
          onClick={() => void handleConfirm()}
          disabled={
            executing ||
            completed ||
            (isCreateTask && !taskFields?.title.trim())
          }
        >
          <Check className="h-3.5 w-3.5" />
          {completed
            ? doneLabel
            : executing
              ? "Working…"
              : preview.executeLabel}
        </Button>
        {!completed && (
          <Button
            size="sm"
            variant="ghost"
            className="gap-1.5"
            onClick={() => void handleDismiss()}
            disabled={executing}
            aria-label="Dismiss action"
          >
            <X className="h-3.5 w-3.5" />
            Cancel
          </Button>
        )}
      </div>
    </div>
  );
}