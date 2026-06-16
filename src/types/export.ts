import { z } from "zod";
import { TaskSchema } from "./task";
import { TagSchema } from "./tag";
import { CategorySchema } from "./category";
import { WeeklyReportSchema } from "./report";
import { ChatSessionSchema, ChatMessageSchema } from "./chat";
import { AppSettingsSchema, UserMemoryEntrySchema } from "./settings";

export const HesiaExportBundleSchema = z.object({
  version: z.string(),
  exportedAt: z.string().datetime(),
  tasks: z.array(TaskSchema),
  tags: z.array(TagSchema),
  categories: z.array(CategorySchema),
  weeklyReports: z.array(WeeklyReportSchema),
  chatSessions: z.array(ChatSessionSchema),
  chatMessages: z.array(ChatMessageSchema),
  userMemory: z.array(UserMemoryEntrySchema),
  settings: AppSettingsSchema,
});

export type HesiaExportBundle = z.infer<typeof HesiaExportBundleSchema>;

/** @deprecated Use HesiaExportBundleSchema */
export const AetherExportBundleSchema = HesiaExportBundleSchema;
/** @deprecated Use HesiaExportBundle */
export type AetherExportBundle = HesiaExportBundle;