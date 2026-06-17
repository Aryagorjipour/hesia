"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db/schema";
import { ensureMainChatSession } from "@/lib/db/init";
import { addChatMessage, clearChatSession } from "@/lib/db/mutations/chat";
import { streamChatCompletion } from "@/lib/ai/client";
import { buildContext } from "@/lib/ai/context-builder";
import { persistMemoryUpdates } from "@/lib/ai/memory-parser";
import { toast } from "@/lib/toast";
import { toISO } from "@/lib/utils/dates";
import type { ChatMessage } from "@/types/chat";

export function useChatSession() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [streaming, setStreaming] = useState(false);
  const [streamText, setStreamText] = useState("");
  const abortRef = useRef(false);

  const settings = useLiveQuery(() => db.settings.get("default"));
  const aiConfig = settings?.aiConfig;

  useEffect(() => {
    void ensureMainChatSession().then(setSessionId);
  }, []);

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
    messages,
    streamingMessage,
    streaming,
    aiConfigured: !!aiConfig?.baseUrl && !!aiConfig?.model,
    aiConfig,
    sendMessage,
    stopStreaming,
    clearChat,
  };
}