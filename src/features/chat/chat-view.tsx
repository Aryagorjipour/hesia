"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { MessageCircle, RotateCcw, Settings } from "lucide-react";
import { MessageBubble } from "./message-bubble";
import { ChatInput } from "./chat-input";
import { QuickActions } from "./quick-actions";
import { useChatSession } from "./use-chat-session";
import { useOnlineStatus } from "@/lib/hooks/use-online-status";
import { MobilePageHeader } from "@/components/layout/mobile-page-header";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export function ChatView() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const isOnline = useOnlineStatus();
  const {
    messages,
    streamingMessage,
    streaming,
    aiConfigured,
    sendMessage,
    stopStreaming,
    clearChat,
  } = useChatSession();

  const displayMessages = streamingMessage
    ? [...messages, streamingMessage]
    : messages;

  const chatDisabled = !isOnline;

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [displayMessages.length, streamingMessage?.content]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <MobilePageHeader
        title="Companion"
        subtitle="Context from your local data"
        actions={
          <>
            {messages.length > 0 && (
              <Button
                variant="ghost"
                size="icon"
                className="h-11 w-11 rounded-xl"
                onClick={() => void clearChat()}
                disabled={streaming}
                aria-label="Clear chat"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            )}
            {!aiConfigured && (
              <Button
                variant="secondary"
                size="sm"
                className="h-11 gap-1.5"
                asChild
              >
                <Link href="/settings/ai">
                  <Settings className="h-3.5 w-3.5" />
                  Set up AI
                </Link>
              </Button>
            )}
          </>
        }
      />

      <div
        ref={scrollRef}
        className="min-h-0 flex-1 overflow-y-auto px-3 py-4 sm:px-4 lg:px-6"
      >
        {!aiConfigured ? (
          <EmptyState
            icon={Settings}
            title="Connect your AI"
            description="Add your provider in Settings → AI. Your key stays encrypted in the browser — Hesia rebuilds context from local data each message."
            action={
              <Button asChild>
                <Link href="/settings/ai">Configure AI</Link>
              </Button>
            }
            className="mx-auto max-w-md border-solid bg-card/30 py-12"
          />
        ) : displayMessages.length === 0 ? (
          <div className="mx-auto flex max-w-lg flex-col items-center pt-8 text-center sm:pt-16">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/15">
              <MessageCircle className="h-6 w-6 text-accent" />
            </div>
            <h2 className="text-lg font-medium text-foreground">
              What&apos;s on your mind?
            </h2>
            <p className="mt-2 max-w-sm text-sm text-muted-foreground">
              I see your recent tasks, stats, and memory. Ask for reflection,
              planning, or log a win.
            </p>
            <div className="mt-6">
              <QuickActions
                onSelect={(p) => void sendMessage(p)}
                disabled={streaming || chatDisabled}
              />
            </div>
          </div>
        ) : (
          <div className="mx-auto flex max-w-2xl flex-col gap-5">
            {displayMessages.map((msg) => (
              <MessageBubble
                key={msg.id}
                message={msg}
                isStreaming={msg.id === "streaming" && streaming}
              />
            ))}
          </div>
        )}
      </div>

      {aiConfigured && displayMessages.length > 0 && (
        <div className="shrink-0 border-t border-border/40 px-3 py-2 sm:px-4 lg:px-6">
          <QuickActions
            onSelect={(p) => void sendMessage(p)}
            disabled={streaming || chatDisabled}
          />
        </div>
      )}

      {aiConfigured && (
        <ChatInput
          onSend={(t) => void sendMessage(t)}
          onStop={stopStreaming}
          disabled={!aiConfigured}
          offline={chatDisabled}
          streaming={streaming}
        />
      )}
    </div>
  );
}