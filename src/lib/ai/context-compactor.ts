import { db } from "@/lib/db/schema";
import { streamFeatureCompletion } from "@/lib/ai/ai-service";
import { updateChatSession } from "@/lib/db/mutations/chat";
import type { AppSettings } from "@/types/settings";
import type { ChatMessage } from "@/types/chat";

const COMPACT_WHEN_MESSAGES = 28;
const KEEP_RECENT_MESSAGES = 14;

export function shouldCompactSession(messageCount: number): boolean {
  return messageCount >= COMPACT_WHEN_MESSAGES;
}

function formatMessagesForSummary(messages: ChatMessage[]): string {
  return messages
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => `${m.role}: ${m.content}`)
    .join("\n\n");
}

async function summarizeMessages(
  settings: AppSettings | undefined,
  existingSummary: string | undefined,
  messages: ChatMessage[],
): Promise<string> {
  const prompt = `Summarize this conversation into concise bullet points. Preserve key facts, decisions, tasks discussed, and user preferences. Max 500 words.

${existingSummary ? `Previous summary:\n${existingSummary}\n\n` : ""}New messages to fold in:\n${formatMessagesForSummary(messages)}`;

  return new Promise((resolve, reject) => {
    void streamFeatureCompletion(
      { settings, feature: "chat" },
      {
        messages: [
          {
            role: "system",
            content:
              "You compress chat history into dense bullet-point summaries for context windows.",
          },
          { role: "user", content: prompt },
        ],
      },
      {
        onToken: () => {},
        onDone: (text) => resolve(text.trim()),
        onError: (err) => reject(err),
      },
    );
  });
}

export async function compactSessionContext(
  sessionId: string,
  settings: AppSettings | undefined,
): Promise<void> {
  const session = await db.chatSessions.get(sessionId);
  if (!session) return;

  const allMessages = await db.chatMessages
    .where("sessionId")
    .equals(sessionId)
    .sortBy("createdAt");

  const conversational = allMessages.filter(
    (m) => m.role === "user" || m.role === "assistant",
  );

  if (!shouldCompactSession(conversational.length)) return;

  let startIndex = 0;
  if (session.compactedBeforeMessageId) {
    const compactedIdx = allMessages.findIndex(
      (m) => m.id === session.compactedBeforeMessageId,
    );
    if (compactedIdx >= 0) startIndex = compactedIdx + 1;
  }

  const slice = allMessages.slice(startIndex);
  if (slice.length <= KEEP_RECENT_MESSAGES) return;

  const toCompact = slice.slice(0, slice.length - KEEP_RECENT_MESSAGES);
  const conversationalToCompact = toCompact.filter(
    (m) => m.role === "user" || m.role === "assistant",
  );
  if (conversationalToCompact.length === 0) return;

  const summary = await summarizeMessages(
    settings,
    session.contextSummary,
    conversationalToCompact,
  );

  const lastCompacted = toCompact[toCompact.length - 1]!;

  await updateChatSession(sessionId, {
    contextSummary: summary,
    compactedBeforeMessageId: lastCompacted.id,
  });
}