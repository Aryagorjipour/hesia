import { v4 as uuidv4 } from "uuid";
import { db } from "@/lib/db/schema";
import { toISO } from "@/lib/utils/dates";
import type { SyncTombstone } from "@/types/p2p-sync";

export async function recordTombstone(
  entityType: SyncTombstone["entityType"],
  entityKey: string,
): Promise<void> {
  const deletedAt = toISO(new Date());
  const existing = await db.syncTombstones
    .where("entityKey")
    .equals(entityKey)
    .filter((t) => t.entityType === entityType)
    .first();

  if (existing) {
    await db.syncTombstones.update(existing.id, { deletedAt });
    return;
  }

  await db.syncTombstones.put({
    id: uuidv4(),
    entityType,
    entityKey,
    deletedAt,
  });
}