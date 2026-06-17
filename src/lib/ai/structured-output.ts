import { z } from "zod";
import { TaskStatusSchema } from "@/types/task";

export const AiTaskDraftSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  notes: z.string().optional(),
  isPlanned: z.boolean(),
  status: TaskStatusSchema,
  tags: z.array(z.string()).default([]),
  category: z.string().optional(),
  durationMinutes: z.number().int().positive().optional(),
});

export type AiTaskDraft = z.infer<typeof AiTaskDraftSchema>;

export function parseAiTaskDraft(text: string): AiTaskDraft | null {
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;
  try {
    const parsed = JSON.parse(jsonMatch[0]);
    const result = AiTaskDraftSchema.safeParse(parsed);
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}