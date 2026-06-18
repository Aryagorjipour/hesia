import { z } from "zod";

export const TagSuggestionSchema = z.object({
  tags: z.array(z.string()).max(8),
  reasoning: z.string().optional(),
});

export type TagSuggestion = z.infer<typeof TagSuggestionSchema>;

export const CategorySuggestionSchema = z.object({
  category: z.string().nullable(),
  reasoning: z.string().optional(),
});

export type CategorySuggestion = z.infer<typeof CategorySuggestionSchema>;

export const TimeEstimateSuggestionSchema = z.object({
  durationMinutes: z.number().int().positive().max(24 * 60),
  reasoning: z.string().optional(),
});

export type TimeEstimateSuggestion = z.infer<typeof TimeEstimateSuggestionSchema>;

export const PlannedSuggestionSchema = z.object({
  isPlanned: z.boolean(),
  reasoning: z.string().optional(),
});

export type PlannedSuggestion = z.infer<typeof PlannedSuggestionSchema>;

export interface TaskSuggestionContext {
  title: string;
  description?: string;
  notes?: string;
  status?: string;
  isPlanned?: boolean;
  tags?: string[];
  category?: string;
  durationMinutes?: number;
}