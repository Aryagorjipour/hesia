"use client";

import { useState } from "react";
import { Layers, Sparkles, User } from "lucide-react";
import { format, parseISO } from "date-fns";
import type { ChatMessage } from "@/types/chat";
import { stripMemoryBlocks } from "@/lib/ai/memory-parser";
import {
  parseTaskDraftBlocks,
  stripTaskDraftBlocks,
} from "@/lib/ai/task-draft-parser";
import {
  resolveActionsFromContent,
  stripHesiaActionBlocks,
} from "@/lib/ai/json-action-fallback";
import { executeConfirmedAction } from "@/lib/ai/action-executor";
import {
  addTaskSuggestionToBoard,
  taskSuggestionFromCreateTaskPayload,
  taskSuggestionFromDraft,
} from "@/lib/chat/task-suggestion";
import {
  setChatActionState,
  setChatActionStates,
  setChatTaskDraftState,
  setChatTaskDraftStates,
} from "@/lib/db/mutations/chat";
import { toast } from "@/lib/toast";
import { MarkdownContent } from "./markdown-content";
import { TaskDraftCard } from "./task-draft-card";
import { ActionPreviewCard } from "./action-preview-card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

interface MessageBubbleProps {
  message: ChatMessage;
  isStreaming?: boolean;
  highlighted?: boolean;
}

function actionStatusAt(
  states: ChatMessage["metadata"],
  index: number,
): "pending" | "completed" | "dismissed" {
  const value = states?.actionStates?.[index];
  if (value === "completed" || value === "dismissed") return value;
  return "pending";
}

function taskDraftStatusAt(
  states: ChatMessage["metadata"],
  index: number,
): "pending" | "added" | "dismissed" {
  const value = states?.taskDraftStates?.[index];
  if (value === "added" || value === "dismissed") return value;
  return "pending";
}

export function MessageBubble({
  message,
  isStreaming,
  highlighted,
}: MessageBubbleProps) {
  const isUser = message.role === "user";
  const raw = message.content;
  const displayContent = isUser
    ? raw
    : stripHesiaActionBlocks(
        stripTaskDraftBlocks(stripMemoryBlocks(raw)),
      );
  const taskDrafts = isUser ? [] : parseTaskDraftBlocks(raw);
  const actions = isUser
    ? []
    : resolveActionsFromContent(raw, message.metadata?.actions);
  const [addingAll, setAddingAll] = useState(false);

  const persistable = !isStreaming && message.id !== "streaming";
  const metadata = message.metadata;

  const visibleActions = actions.filter(
    (_, index) => actionStatusAt(metadata, index) !== "dismissed",
  );
  const visibleActionIndices = actions
    .map((_, index) => index)
    .filter((index) => actionStatusAt(metadata, index) !== "dismissed");

  const createTaskActionCount = actions.filter(
    (a) => a.type === "create_task",
  ).length;
  const totalTaskSuggestions = createTaskActionCount + taskDrafts.length;

  const pendingActionIndices = actions
    .map((action, index) => ({ action, index }))
    .filter(
      ({ action, index }) =>
        action.type === "create_task" &&
        actionStatusAt(metadata, index) === "pending",
    );
  const pendingDraftIndices = taskDrafts
    .map((_, index) => index)
    .filter((index) => taskDraftStatusAt(metadata, index) === "pending");

  const pendingTaskCount =
    pendingActionIndices.length + pendingDraftIndices.length;

  const showAddAll = totalTaskSuggestions > 2 && pendingTaskCount > 0;

  async function handleAddAll() {
    if (!persistable || pendingTaskCount === 0) return;

    setAddingAll(true);
    let added = 0;
    let failed = 0;
    const nextActionStates = [...(metadata?.actionStates ?? [])];
    const nextDraftStates = [...(metadata?.taskDraftStates ?? [])];

    try {
      for (const { action, index } of pendingActionIndices) {
        try {
          if (action.type === "create_task") {
            await addTaskSuggestionToBoard(
              taskSuggestionFromCreateTaskPayload(action.payload),
            );
          } else {
            const result = await executeConfirmedAction(action);
            if (!result.ok) {
              failed += 1;
              continue;
            }
          }
          while (nextActionStates.length <= index) {
            nextActionStates.push(undefined);
          }
          nextActionStates[index] = "completed";
          added += 1;
        } catch {
          failed += 1;
        }
      }

      for (const index of pendingDraftIndices) {
        try {
          await addTaskSuggestionToBoard(taskSuggestionFromDraft(taskDrafts[index]));
          while (nextDraftStates.length <= index) {
            nextDraftStates.push(undefined);
          }
          nextDraftStates[index] = "added";
          added += 1;
        } catch {
          failed += 1;
        }
      }

      await setChatActionStates(message.id, nextActionStates);
      await setChatTaskDraftStates(message.id, nextDraftStates);

      if (added > 0) {
        toast.success({
          title:
            added === 1 ? "Task added to board" : `${added} tasks added to board`,
          description:
            failed > 0
              ? `${failed} could not be added — try those individually.`
              : "All suggestions from this message are on your board.",
        });
      } else {
        toast.error({
          title: "Could not add tasks",
          description: "Try adding them one at a time.",
        });
      }
    } finally {
      setAddingAll(false);
    }
  }

  return (
    <div
      data-message-id={message.id}
      className={cn(
        "flex gap-3 rounded-2xl transition-colors duration-500",
        isUser ? "flex-row-reverse" : "flex-row",
        highlighted && "bg-accent/10 ring-2 ring-accent/30",
      )}
    >
      <div
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl",
          isUser ? "bg-muted/50" : "bg-accent/15",
        )}
      >
        {isUser ? (
          <User className="h-4 w-4 text-muted-foreground" />
        ) : (
          <Sparkles className="h-4 w-4 text-accent" />
        )}
      </div>

      <div
        className={cn(
          "min-w-0 max-w-[85%] sm:max-w-[75%]",
          isUser ? "text-right" : "text-left",
        )}
      >
        <div
          className={cn(
            "inline-block rounded-2xl px-4 py-2.5 text-left",
            isUser
              ? "bg-accent/15 text-foreground"
              : "bg-muted/25 text-foreground",
          )}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap text-sm leading-relaxed">
              {displayContent}
            </p>
          ) : (
            <MarkdownContent
              content={
                displayContent ||
                (isStreaming
                  ? "…"
                  : visibleActions.length > 0 || taskDrafts.length > 0
                    ? ""
                    : "")
              }
            />
          )}

          {showAddAll && (
            <Button
              size="sm"
              variant="secondary"
              className="mt-3 w-full gap-1.5"
              onClick={() => void handleAddAll()}
              disabled={addingAll}
            >
              <Layers className="h-3.5 w-3.5" />
              {addingAll
                ? "Adding…"
                : `Add all to board (${pendingTaskCount})`}
            </Button>
          )}

          {visibleActionIndices.map((actionIndex) => {
            const action = actions[actionIndex];
            return (
              <ActionPreviewCard
                key={`${action.type}-${actionIndex}`}
                action={action}
                status={actionStatusAt(metadata, actionIndex)}
                onStatusChange={
                  persistable
                    ? async (status) => {
                        await setChatActionState(
                          message.id,
                          actionIndex,
                          status,
                        );
                      }
                    : undefined
                }
              />
            );
          })}

          {taskDrafts.map((draft, index) => {
            if (taskDraftStatusAt(metadata, index) === "dismissed") {
              return null;
            }
            return (
              <TaskDraftCard
                key={`${draft.title}-${index}`}
                draft={draft}
                status={taskDraftStatusAt(metadata, index)}
                onStatusChange={
                  persistable
                    ? async (status) => {
                        await setChatTaskDraftState(message.id, index, status);
                      }
                    : undefined
                }
              />
            );
          })}
        </div>
        <p className="mt-1 px-1 text-[10px] text-muted-foreground/60">
          {format(parseISO(message.createdAt), "h:mm a")}
          {isStreaming && " · typing"}
        </p>
      </div>
    </div>
  );
}