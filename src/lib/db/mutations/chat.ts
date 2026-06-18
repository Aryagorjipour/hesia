import { v4 as uuidv4 } from "uuid";
import { db } from "../schema";
import { toISO } from "@/lib/utils/dates";
import type { ChatMessage, ChatSession } from "@/types/chat";

const DEFAULT_SESSION_TITLES = new Set(["Main", "New chat"]);

export async function addChatMessage(
  sessionId: string,
  role: ChatMessage["role"],
  content: string,
  metadata?: ChatMessage["metadata"],
): Promise<ChatMessage> {
  const now = toISO(new Date());
  const message: ChatMessage = {
    id: uuidv4(),
    sessionId,
    role,
    content,
    createdAt: now,
    metadata,
  };

  await db.transaction("rw", db.chatMessages, db.chatSessions, async () => {
    await db.chatMessages.add(message);
    await db.chatSessions.update(sessionId, { updatedAt: now });
  });

  return message;
}

export async function clearChatSession(sessionId: string): Promise<void> {
  const now = toISO(new Date());
  await db.transaction("rw", db.chatMessages, db.chatSessions, async () => {
    await db.chatMessages.where("sessionId").equals(sessionId).delete();
    const session = await db.chatSessions.get(sessionId);
    if (session) {
      await db.chatSessions.put({
        id: session.id,
        title: session.title,
        weekStart: session.weekStart,
        createdAt: session.createdAt,
        updatedAt: now,
      });
    }
  });
}

export async function createChatSession(
  title = "New chat",
): Promise<ChatSession> {
  const now = toISO(new Date());
  const session: ChatSession = {
    id: uuidv4(),
    title,
    createdAt: now,
    updatedAt: now,
  };
  await db.chatSessions.put(session);
  return session;
}

export async function deleteChatSession(sessionId: string): Promise<void> {
  const count = await db.chatSessions.count();
  if (count <= 1) {
    throw new Error("Cannot delete the last chat session");
  }

  await db.transaction("rw", db.chatMessages, db.chatSessions, async () => {
    await db.chatMessages.where("sessionId").equals(sessionId).delete();
    await db.chatSessions.delete(sessionId);
  });
}

export async function updateChatSession(
  sessionId: string,
  patch: Partial<
    Pick<
      ChatSession,
      | "title"
      | "contextSummary"
      | "compactedBeforeMessageId"
      | "updatedAt"
    >
  >,
): Promise<void> {
  await db.chatSessions.update(sessionId, {
    ...patch,
    updatedAt: patch.updatedAt ?? toISO(new Date()),
  });
}

function setIndexedState<T>(
  current: (T | undefined)[] | undefined,
  index: number,
  value: T,
): (T | undefined)[] {
  const next = [...(current ?? [])];
  while (next.length <= index) {
    next.push(undefined);
  }
  next[index] = value;
  return next;
}

export async function patchChatMessageMetadata(
  messageId: string,
  patch: Partial<NonNullable<ChatMessage["metadata"]>>,
): Promise<void> {
  const message = await db.chatMessages.get(messageId);
  if (!message) return;

  await db.chatMessages.update(messageId, {
    metadata: { ...message.metadata, ...patch },
  });
}

export async function setChatActionState(
  messageId: string,
  index: number,
  state: "completed" | "dismissed",
): Promise<void> {
  const message = await db.chatMessages.get(messageId);
  if (!message) return;

  await patchChatMessageMetadata(messageId, {
    actionStates: setIndexedState(message.metadata?.actionStates, index, state),
  });
}

export async function setChatTaskDraftState(
  messageId: string,
  index: number,
  state: "added" | "dismissed",
): Promise<void> {
  const message = await db.chatMessages.get(messageId);
  if (!message) return;

  await patchChatMessageMetadata(messageId, {
    taskDraftStates: setIndexedState(
      message.metadata?.taskDraftStates,
      index,
      state,
    ),
  });
}

export async function setChatActionStates(
  messageId: string,
  states: NonNullable<ChatMessage["metadata"]>["actionStates"],
): Promise<void> {
  await patchChatMessageMetadata(messageId, { actionStates: states });
}

export async function setChatTaskDraftStates(
  messageId: string,
  states: NonNullable<ChatMessage["metadata"]>["taskDraftStates"],
): Promise<void> {
  await patchChatMessageMetadata(messageId, { taskDraftStates: states });
}

export async function maybeUpdateSessionTitleFromMessage(
  sessionId: string,
  userText: string,
): Promise<void> {
  const session = await db.chatSessions.get(sessionId);
  if (!session) return;

  const title = session.title?.trim();
  if (title && !DEFAULT_SESSION_TITLES.has(title)) return;

  const next =
    userText.trim().slice(0, 48) + (userText.trim().length > 48 ? "…" : "");
  if (!next) return;

  await updateChatSession(sessionId, { title: next });
}