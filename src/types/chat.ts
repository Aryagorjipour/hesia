import { z } from "zod";

export const ChatSessionSchema = z.object({
  id: z.string().uuid(),
  title: z.string().optional(),
  weekStart: z.string().optional(),
  /** Compacted summary of older turns in this session */
  contextSummary: z.string().optional(),
  /** Last message id included in contextSummary */
  compactedBeforeMessageId: z.string().uuid().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type ChatSession = z.infer<typeof ChatSessionSchema>;

export const ChatMessageSchema = z.object({
  id: z.string().uuid(),
  sessionId: z.string().uuid(),
  role: z.enum(["user", "assistant", "system"]),
  content: z.string(),
  createdAt: z.string().datetime(),
  metadata: z
    .object({
      model: z.string().optional(),
      tokens: z.number().optional(),
    })
    .optional(),
});

export type ChatMessage = z.infer<typeof ChatMessageSchema>;