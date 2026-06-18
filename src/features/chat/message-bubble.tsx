"use client";

import { useState } from "react";
import { Sparkles, User } from "lucide-react";
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
import { MarkdownContent } from "./markdown-content";
import { TaskDraftCard } from "./task-draft-card";
import { ActionPreviewCard } from "./action-preview-card";
import { cn } from "@/lib/utils/cn";

interface MessageBubbleProps {
  message: ChatMessage;
  isStreaming?: boolean;
  highlighted?: boolean;
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
  const [dismissedActions, setDismissedActions] = useState<Set<number>>(
    () => new Set(),
  );

  const visibleActions = actions.filter((_, index) => !dismissedActions.has(index));

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
          {visibleActions.map((action, i) => (
            <ActionPreviewCard
              key={`${action.type}-${i}`}
              action={action}
              onDismiss={() =>
                setDismissedActions((prev) => new Set(prev).add(i))
              }
            />
          ))}
          {taskDrafts.map((draft, i) => (
            <TaskDraftCard key={`${draft.title}-${i}`} draft={draft} />
          ))}
        </div>
        <p className="mt-1 px-1 text-[10px] text-muted-foreground/60">
          {format(parseISO(message.createdAt), "h:mm a")}
          {isStreaming && " · typing"}
        </p>
      </div>
    </div>
  );
}