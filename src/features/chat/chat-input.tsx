"use client";

import { useRef, useState } from "react";
import { ArrowUp, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useVisualViewportOffset } from "@/lib/hooks/use-visual-viewport-offset";
import { cn } from "@/lib/utils/cn";

interface ChatInputProps {
  onSend: (text: string) => void;
  onStop?: () => void;
  disabled?: boolean;
  streaming?: boolean;
  offline?: boolean;
  placeholder?: string;
}

export function ChatInput({
  onSend,
  onStop,
  disabled,
  streaming,
  offline,
  placeholder = "Ask about your rhythm, patterns, or plans…",
}: ChatInputProps) {
  const [text, setText] = useState("");
  const ref = useRef<HTMLTextAreaElement>(null);
  const viewportOffset = useVisualViewportOffset();

  const isDisabled = disabled || offline;

  function handleSubmit() {
    const trimmed = text.trim();
    if (!trimmed || isDisabled || streaming) return;
    onSend(trimmed);
    setText("");
    ref.current?.focus();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  return (
    <div
      className="border-t border-border bg-background/80 px-3 py-3 backdrop-blur-sm sm:px-4 lg:px-6"
      style={{
        paddingBottom: `calc(0.75rem + ${viewportOffset}px)`,
      }}
    >
      {offline && (
        <p className="mb-2 text-center text-[11px] text-amber-200/80">
          AI needs a connection — you can still read your chat history.
        </p>
      )}
      <div className="relative flex items-end gap-2 rounded-2xl border border-border/60 bg-card/50 p-2">
        <Textarea
          ref={ref}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            offline ? "Offline — connect to send messages" : placeholder
          }
          rows={1}
          disabled={isDisabled}
          className={cn(
            "min-h-[44px] max-h-32 resize-none border-0 bg-transparent px-2 py-2.5 shadow-none focus-visible:ring-0",
          )}
        />
        {streaming ? (
          <Button
            type="button"
            size="icon"
            variant="secondary"
            className="h-11 w-11 shrink-0 rounded-xl"
            onClick={onStop}
            aria-label="Stop"
          >
            <Square className="h-3.5 w-3.5" />
          </Button>
        ) : (
          <Button
            type="button"
            size="icon"
            className="h-11 w-11 shrink-0 rounded-xl"
            onClick={handleSubmit}
            disabled={isDisabled || !text.trim()}
            aria-label="Send"
          >
            <ArrowUp className="h-4 w-4" />
          </Button>
        )}
      </div>
      <p className="mt-1.5 text-center text-[10px] text-muted-foreground/60">
        Enter to send · Shift+Enter for new line
      </p>
    </div>
  );
}