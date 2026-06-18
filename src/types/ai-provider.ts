import { z } from "zod";

export const AiProviderPresetSchema = z.enum([
  "grok",
  "ollama",
  "openrouter",
  "openai",
  "groq",
  "custom",
]);

export type AiProviderPreset = z.infer<typeof AiProviderPresetSchema>;

export const AiFeatureKeySchema = z.enum([
  "chat",
  "reflection",
  "tagging",
  "categorization",
  "time-estimate",
  "planned-suggest",
  "quick-log",
]);

export type AiFeatureKey = z.infer<typeof AiFeatureKeySchema>;

export const AI_FEATURE_KEYS = AiFeatureKeySchema.options;

export const AiProfileCapabilitiesSchema = z.object({
  supportsToolCalls: z.boolean().optional(),
  probedAt: z.string().datetime().optional(),
});

export type AiProfileCapabilities = z.infer<typeof AiProfileCapabilitiesSchema>;

export const AiProviderProfileSchema = z.object({
  id: z.string().uuid(),
  label: z.string().min(1).max(64),
  providerPreset: AiProviderPresetSchema,
  baseUrl: z.string().min(1),
  encryptedApiKey: z.string().optional(),
  model: z.string().min(1),
  temperature: z.number().min(0).max(2).default(0.7),
  streaming: z.boolean().default(true),
  maxContextWeeks: z.number().int().min(1).max(12).default(4),
  customSystemPrompt: z.string().optional(),
  optionalHeaders: z.record(z.string(), z.string()).optional(),
  capabilities: AiProfileCapabilitiesSchema.optional(),
});

export type AiProviderProfile = z.infer<typeof AiProviderProfileSchema>;

export const AiFeatureRoutingSchema = z.object({
  chat: z.string().uuid(),
  reflection: z.string().uuid(),
  tagging: z.string().uuid(),
  categorization: z.string().uuid(),
  "time-estimate": z.string().uuid(),
  "planned-suggest": z.string().uuid(),
  "quick-log": z.string().uuid(),
});

export type AiFeatureRouting = z.infer<typeof AiFeatureRoutingSchema>;