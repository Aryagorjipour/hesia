import { z } from "zod";

export const TagSchema = z.object({
  name: z.string().min(1),
  colorHex: z.string(),
  usageCount: z.number().int().nonnegative().default(0),
  lastUsedAt: z.string().datetime().optional(),
});

export type Tag = z.infer<typeof TagSchema>;