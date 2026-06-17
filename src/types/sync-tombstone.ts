import { z } from "zod";

export const SyncTombstoneSchema = z.object({
  id: z.string().uuid(),
  entityType: z.enum(["task", "tag", "category"]),
  entityKey: z.string(),
  deletedAt: z.string().datetime(),
});

export type SyncTombstone = z.infer<typeof SyncTombstoneSchema>;