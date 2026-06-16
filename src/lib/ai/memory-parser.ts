import { v4 as uuidv4 } from "uuid";
import { db } from "@/lib/db/schema";
import { toISO } from "@/lib/utils/dates";
import type { UserMemoryEntry } from "@/types/settings";

const MEMORY_BLOCK_REGEX =
  /\[MEMORY UPDATE\]\s*type:\s*(goal|preference|pattern|fact)\s*content:\s*([\s\S]+?)\s*\[\/MEMORY UPDATE\]/gi;

export function parseMemoryUpdates(text: string): Omit<UserMemoryEntry, "id" | "updatedAt" | "source">[] {
  const results: Omit<UserMemoryEntry, "id" | "updatedAt" | "source">[] = [];
  let match: RegExpExecArray | null;
  const regex = new RegExp(MEMORY_BLOCK_REGEX);

  while ((match = regex.exec(text)) !== null) {
    results.push({
      type: match[1] as UserMemoryEntry["type"],
      content: match[2].trim(),
    });
  }

  return results;
}

export async function persistMemoryUpdates(text: string): Promise<number> {
  const updates = parseMemoryUpdates(text);
  const now = toISO(new Date());

  for (const update of updates) {
    await db.userMemory.put({
      id: uuidv4(),
      ...update,
      source: "ai",
      updatedAt: now,
    });
  }

  return updates.length;
}

export function stripMemoryBlocks(text: string): string {
  return text.replace(MEMORY_BLOCK_REGEX, "").trim();
}