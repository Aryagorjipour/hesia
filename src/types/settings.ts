import { z } from "zod";
import {
  AiFeatureRoutingSchema,
  AiProviderPresetSchema,
  AiProviderProfileSchema,
} from "./ai-provider";
import { McpServerConfigSchema } from "./mcp";
import { TaskStatusSchema } from "./task";

export { AiProviderPresetSchema };
export type { AiProviderPreset } from "./ai-provider";

export const ZenPresetSchema = z.enum([
  "sage-dune",
  "sage-dune-dark",
  "calm-teal",
  "warm-arc",
  "forest-zen",
  "monochrome-focus",
  "soft-dawn",
  "deep-night",
  "ocean-mist",
  "lavender-haze",
  "slate-minimal",
  "sunset-glow",
  "paper-zen",
  "sage-morning",
  "sky-clarity",
  "sandstone",
  "ink-studio",
  "sakura-night",
  "nordic-noir",
  "earth-clay",
  "coral-bloom",
  "mint-breeze",
]);

export type ZenPreset = z.infer<typeof ZenPresetSchema>;

export const ProfileSchema = z.object({
  username: z.string().max(40).optional(),
  workspaceName: z.string().max(60).optional(),
});

export type Profile = z.infer<typeof ProfileSchema>;

const PresetColumnNamesSchema = z.object({
  inbox: z.string().min(1).max(32).optional(),
  todo: z.string().min(1).max(32).optional(),
  doing: z.string().min(1).max(32).optional(),
  done: z.string().min(1).max(32).optional(),
  archived: z.string().min(1).max(32).optional(),
});

export const PresetWorkspaceConfigSchema = z.object({
  columnNames: PresetColumnNamesSchema.optional(),
  boardSubtitle: z.string().max(120).optional(),
});

export type PresetWorkspaceConfig = z.infer<typeof PresetWorkspaceConfigSchema>;

export const AiConfigSchema = z.object({
  providerPreset: AiProviderPresetSchema,
  baseUrl: z.string(),
  encryptedApiKey: z.string().optional(),
  model: z.string(),
  temperature: z.number().min(0).max(2).default(0.7),
  maxContextWeeks: z.number().int().min(1).max(12).default(4),
  streaming: z.boolean().default(true),
  customSystemPrompt: z.string().optional(),
});

export type AiConfig = z.infer<typeof AiConfigSchema>;

export const WeekStartsOnSchema = z.number().int().min(0).max(6).default(1);

export type WeekStartsOnSetting = z.infer<typeof WeekStartsOnSchema>;

export const LocaleSettingsSchema = z.object({
  calendar: z.enum(["jalali", "gregorian"]).default("gregorian"),
  direction: z.enum(["rtl", "ltr"]).default("ltr"),
});

export type LocaleSettings = z.infer<typeof LocaleSettingsSchema>;

export const RelaySettingsSchema = z.object({
  enabled: z.boolean().default(false),
  url: z.string().default("http://127.0.0.1:8787"),
});

export type RelaySettings = z.infer<typeof RelaySettingsSchema>;

export const AppSettingsSchema = z.object({
  id: z.literal("default"),
  onboardingComplete: z.boolean().default(false),
  profile: ProfileSchema.default({}),
  zenPreset: ZenPresetSchema.default("sage-dune-dark"),
  presetWorkspaceConfigs: z
    .record(z.string(), PresetWorkspaceConfigSchema)
    .optional(),
  weekStartsOn: WeekStartsOnSchema,
  theme: z.enum(["light", "dark", "system"]).default("dark"),
  columnNames: z.record(TaskStatusSchema, z.string()).optional(),
  /** @deprecated Use aiProfiles — migrated automatically in Dexie v6 */
  aiConfig: AiConfigSchema.optional(),
  aiProfiles: z.array(AiProviderProfileSchema).optional(),
  aiFeatureRouting: AiFeatureRoutingSchema.optional(),
  notifications: z
    .object({
      weeklyReflection: z.boolean().default(false),
      reflectionDay: z.number().int().min(0).max(6).default(0),
      reflectionHour: z.number().int().min(0).max(23).default(18),
    })
    .default({
      weeklyReflection: false,
      reflectionDay: 0,
      reflectionHour: 18,
    }),
  dataDirectoryHint: z.string().optional(),
  locale: LocaleSettingsSchema.default({
    calendar: "gregorian",
    direction: "ltr",
  }),
  relay: RelaySettingsSchema.default({
    enabled: false,
    url: "http://127.0.0.1:8787",
  }),
  mcpServers: z.array(McpServerConfigSchema).default([]),
  desktopCloseToTray: z.boolean().default(false),
  version: z.string().default("0.1.0"),
});

export type AppSettings = z.infer<typeof AppSettingsSchema>;

export const UserMemoryEntrySchema = z.object({
  id: z.string().uuid(),
  type: z.enum(["goal", "preference", "pattern", "fact"]),
  content: z.string(),
  source: z.enum(["ai", "user"]),
  updatedAt: z.string().datetime(),
});

export type UserMemoryEntry = z.infer<typeof UserMemoryEntrySchema>;