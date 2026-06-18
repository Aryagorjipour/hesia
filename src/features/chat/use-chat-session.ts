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
import {
  profileSupportsToolCalls,
  streamFeatureCompletion,
} from "@/lib/ai/ai-service";
import { HESIA_ACTION_TOOLS } from "@/lib/ai/action-schema";
import { parseActionsFromToolCalls } from "@/lib/ai/tool-call-parser";
import {
  parseHesiaActionBlocks,
  stripHesiaActionBlocks,
} from "@/lib/ai/json-action-fallback";
import { buildContext } from "@/lib/ai/context-builder";
import { compactSessionContext } from "@/lib/ai/context-compactor";
import { resolveProfileForFeature } from "@/lib/ai/feature-router";
import { isAiConfiguredForFeature } from "@/lib/ai/is-ai-configured";
import { persistMemoryUpdates } from "@/lib/ai/memory-parser";
import { useChatStore } from "@/stores/chat-store";
import { toast } from "@/lib/toast";
import { toISO } from "@/lib/utils/dates";
import type { ChatMessage } from "@/types/chat";
import type { HesiaAction } from "@/types/ai-actions";

function resolveAssistantActions(
  content: string,
  toolCalls: { id: string; name: string; arguments: string }[] | undefined,
): HesiaAction[] {
  const fromTools = toolCalls?.length
    ? parseActionsFromToolCalls(toolCalls)
    : [];
  if (fromTools.length > 0) return fromTools;
  return parseHesiaActionBlocks(content);
}

export function useChatSession() {
  const activeSessionId = useChatStore((s) => s.activeSessionId);
  const setActiveSessionId = useChatStore((s) => s.setActiveSessionId);

  const [ready, setReady] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [streamText, setStreamText] = useState("");
  const [streamActions, setStreamActions] = useState<HesiaAction[]>([]);
  const abortRef = useRef(false);

  const settings = useLiveQuery(() => db.settings.get("default"));
  const chatProfile = resolveProfileForFeature(settings, "chat");
  const useToolCalls =
    !!chatProfile && profileSupportsToolCalls(chatProfile);

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
      if (!sessionId || !chatProfile || streaming) return;
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        toast.warning({
          title: "You're offline",
          description: "AI chat needs an internet connection.",
        });
        return;
      }

      setStreaming(true);
      setStreamText("");
      setStreamActions([]);
      abortRef.current = false;

      try {
        await maybeUpdateSessionTitleFromMessage(sessionId, userText);
        await addChatMessage(sessionId, "user", userText);

        const { messages: aiMessages } = await buildContext({
          userMessage: userText,
          sessionId,
          maxContextWeeks: chatProfile.maxContextWeeks,
        });

        let fullText = "";

        await new Promise<void>((resolve) => {
          void streamFeatureCompletion(
            { settings, feature: "chat" },
            {
              messages: aiMessages,
              ...(useToolCalls
                ? { tools: HESIA_ACTION_TOOLS, toolChoice: "auto" as const }
                : {}),
            },
            {
              onToken: (token) => {
                if (abortRef.current) return;
                fullText += token;
                setStreamText(fullText);
              },
              onDone: async (text, extras) => {
                if (abortRef.current) {
                  resolve();
                  return;
                }
                fullText = text;
                const actions = resolveAssistantActions(
                  fullText,
                  extras?.toolCalls,
                );
                setStreamActions(actions);

                const displayContent = stripHesiaActionBlocks(fullText);

                try {
                  await persistMemoryUpdates(fullText);
                  await addChatMessage(
                    sessionId,
                    "assistant",
                    displayContent || (actions.length > 0 ? "" : fullText),
                    {
                      model: chatProfile.model,
                      ...(actions.length > 0 ? { actions } : {}),
                    },
                  );
                  void compactSessionContext(sessionId, settings).catch(() => {
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
        setStreamActions([]);
      }
    },
    [sessionId, settings, chatProfile, streaming, useToolCalls],
  );

  const stopStreaming = useCallback(() => {
    abortRef.current = true;
    setStreaming(false);
    setStreamText("");
    setStreamActions([]);
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
    streaming
      ? {
          id: "streaming",
          sessionId: sessionId ?? "",
          role: "assistant",
          content: streamText,
          createdAt: toISO(new Date()),
          ...(streamActions.length > 0
            ? { metadata: { actions: streamActions } }
            : {}),
        }
      : null;

  return {
    sessionId,
    sessions,
    ready,
    messages,
    streamingMessage,
    streaming,
    aiConfigured: isAiConfiguredForFeature(settings, "chat"),
    chatProfile,
    sendMessage,
    stopStreaming,
    clearChat,
    startNewSession,
    switchSession,
    removeSession,
  };
}