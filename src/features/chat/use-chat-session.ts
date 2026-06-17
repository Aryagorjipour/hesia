"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db/schema";
import { ensureDefaultChatSessions } from "@/lib/db/init";
import {
  addChatMessage,
  clearChatSession,
  createChatSession,
  deleteChatSession,
  maybeUpdateSessionTitleFromMessage,
} from "@/lib/db/mutations/chat";
import { streamChatCompletion } from "@/lib/ai/client";
import { buildContext } from "@/lib/ai/context-builder";
import { compactSessionContext } from "@/lib/ai/context-compactor";
import { isAiConfigured } from "@/lib/ai/is-ai-configured";
import { persistMemoryUpdates } from "@/lib/ai/memory-parser";
import { useChatStore } from "@/stores/chat-store";
import { toast } from "@/lib/toast";
import { toISO } from "@/lib/utils/dates";
import type { ChatMessage } from "@/types/chat";

export function useChatSession() {
  const activeSessionId = useChatStore((s) => s.activeSessionId);
  const setActiveSessionId = useChatStore((s) => s.setActiveSessionId);

  const [ready, setReady] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [streamText, setStreamText] = useState("");
  const abortRef = useRef(false);

  const settings = useLiveQuery(() => db.settings.get("default"));
  const aiConfig = settings?.aiConfig;

  const sessions =
    useLiveQuery(() =>
      db.chatSessions.orderBy("updatedAt").reverse().toArray(),
    ) ?? [];

  useEffect(() => {
    void ensureDefaultChatSessions().then(({ defaultSessionId, sessionIds }) => {
      const stored = useChatStore.getState().activeSessionId;
      if (stored && sessionIds.includes(stored)) {
        setActiveSessionId(stored);
      } else {
        setActiveSessionId(defaultSessionId);
      }
      setReady(true);
    });
  }, [setActiveSessionId]);

  const sessionId = activeSessionId;

  const messages =
    useLiveQuery(
      async () => {
        if (!sessionId) return [];
        return db.chatMessages
          .where("sessionId")
          .equals(sessionId)
          .sortBy("createdAt");
      },
      [sessionId],
    ) ?? [];

  const sendMessage = useCallback(
    async (userText: string) => {
      if (!sessionId || !aiConfig || streaming) return;
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        toast.warning({
          title: "You're offline",
          description: "AI chat needs an internet connection.",
        });
        return;
      }

      setStreaming(true);
      setStreamText("");
      abortRef.current = false;

      try {
        await maybeUpdateSessionTitleFromMessage(sessionId, userText);
        await addChatMessage(sessionId, "user", userText);

        const { messages: aiMessages } = await buildContext({
          userMessage: userText,
          sessionId,
          maxContextWeeks: aiConfig.maxContextWeeks,
        });

        let fullText = "";

        await new Promise<void>((resolve) => {
          void streamChatCompletion(
            aiConfig,
            { messages: aiMessages },
            {
              onToken: (token) => {
                if (abortRef.current) return;
                fullText += token;
                setStreamText(fullText);
              },
              onDone: async (text) => {
                if (abortRef.current) {
                  resolve();
                  return;
                }
                fullText = text;
                try {
                  await persistMemoryUpdates(fullText);
                  await addChatMessage(sessionId, "assistant", fullText, {
                    model: aiConfig.model,
                  });
                  void compactSessionContext(sessionId, aiConfig).catch(() => {
                    // compaction is best-effort
                  });
                } catch (err) {
                  toast.error({
                    title: "Could not save message",
                    description:
                      err instanceof Error
                        ? err.message
                        : "Failed to save message",
                  });
                }
                resolve();
              },
              onError: (err) => {
                toast.error({
                  title: "AI request failed",
                  description: err.message,
                });
                resolve();
              },
            },
          );
        });
      } catch (err) {
        toast.error({
          title: "Something went wrong",
          description:
            err instanceof Error ? err.message : "Something went wrong",
        });
      } finally {
        setStreaming(false);
        setStreamText("");
      }
    },
    [sessionId, aiConfig, streaming],
  );

  const stopStreaming = useCallback(() => {
    abortRef.current = true;
    setStreaming(false);
    setStreamText("");
  }, []);

  const clearChat = useCallback(async () => {
    if (!sessionId) return;
    await clearChatSession(sessionId);
    toast.info({
      title: "Chat cleared",
      description: "Conversation history has been removed.",
    });
  }, [sessionId]);

  const startNewSession = useCallback(async () => {
    const session = await createChatSession();
    setActiveSessionId(session.id);
    toast.success({
      title: "New chat",
      description: "Started a fresh conversation.",
    });
  }, [setActiveSessionId]);

  const switchSession = useCallback(
    (id: string) => {
      setActiveSessionId(id);
    },
    [setActiveSessionId],
  );

  const removeSession = useCallback(
    async (id: string) => {
      try {
        await deleteChatSession(id);
        if (sessionId === id) {
          const remaining = await db.chatSessions
            .orderBy("updatedAt")
            .reverse()
            .first();
          setActiveSessionId(remaining?.id ?? null);
        }
        toast.success({
          title: "Chat deleted",
          description: "The conversation was removed.",
        });
      } catch (err) {
        toast.error({
          title: "Could not delete chat",
          description:
            err instanceof Error ? err.message : "Could not delete chat",
        });
      }
    },
    [sessionId, setActiveSessionId],
  );

  const streamingMessage: ChatMessage | null =
    streaming && streamText
      ? {
          id: "streaming",
          sessionId: sessionId ?? "",
          role: "assistant",
          content: streamText,
          createdAt: toISO(new Date()),
        }
      : streaming
        ? {
            id: "streaming",
            sessionId: sessionId ?? "",
            role: "assistant",
            content: "",
            createdAt: toISO(new Date()),
          }
        : null;

  return {
    sessionId,
    sessions,
    ready,
    messages,
    streamingMessage,
    streaming,
    aiConfigured: isAiConfigured(aiConfig),
    aiConfig,
    sendMessage,
    stopStreaming,
    clearChat,
    startNewSession,
    switchSession,
    removeSession,
  };
}