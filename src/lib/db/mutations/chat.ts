import { v4 as uuidv4 } from "uuid";
import { db } from "../schema";
import { toISO } from "@/lib/utils/dates";
import type { ChatMessage } from "@/types/chat";

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
    await db.chatSessions.update(sessionId, { updatedAt: now });
  });
}