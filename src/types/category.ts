import { z } from "zod";

export const CategorySchema = z.object({
  name: z.string().min(1),
  colorHex: z.string().optional(),
  description: z.string().optional(),
  iconName: z.string().optional(),
  usageCount: z.number().int().nonnegative().default(0),
  updatedAt: z.string().datetime().optional(),
});

export type Category = z.infer<typeof CategorySchema>;