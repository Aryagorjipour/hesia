"use client";

import { Plus, X } from "lucide-react";
import type { ChatSession } from "@/types/chat";
import { Button } from "@/components/ui/button";
import { confirm } from "@/lib/confirm";
import { cn } from "@/lib/utils/cn";

interface ChatSessionBarProps {
  sessions: ChatSession[];
  activeSessionId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  disabled?: boolean;
}

export function ChatSessionBar({
  sessions,
  activeSessionId,
  onSelect,
  onNew,
  onDelete,
  disabled,
}: ChatSessionBarProps) {
  if (sessions.length === 0) return null;

  return (
    <div className="flex items-center gap-2 border-b border-border/40 px-3 py-2 sm:px-4 lg:px-6">
      <div className="flex min-w-0 flex-1 gap-1.5 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {sessions.map((session) => {
          const active = session.id === activeSessionId;
          const label = session.title?.trim() || "Chat";
          return (
            <div key={session.id} className="group relative shrink-0">
              <button
                type="button"
                disabled={disabled}
                onClick={() => onSelect(session.id)}
                className={cn(
                  "max-w-[9rem] truncate rounded-xl px-3 py-1.5 text-xs font-medium transition-colors sm:max-w-[11rem]",
                  active
                    ? "bg-accent/15 text-accent"
                    : "bg-muted/30 text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                )}
                title={label}
              >
                {label}
              </button>
              {sessions.length > 1 && (
                <button
                  type="button"
                  disabled={disabled}
                  className="absolute -right-1 -top-1 hidden h-4 w-4 items-center justify-center rounded-full bg-muted text-muted-foreground hover:bg-destructive/20 hover:text-destructive group-hover:flex"
                  aria-label={`Delete ${label}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    void (async () => {
                      const ok = await confirm({
                        title: "Delete chat?",
                        description: `Remove "${label}" and all its messages.`,
                        destructive: true,
                      });
                      if (ok) onDelete(session.id);
                    })();
                  }}
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              )}
            </div>
          );
        })}
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8 shrink-0 rounded-xl"
        disabled={disabled}
        onClick={onNew}
        aria-label="New chat"
      >
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  );
}