import { z } from "zod";
import { TaskStatusSchema } from "./task";

export const HESIA_ACTIONS_VERSION = "hesia-actions/v1" as const;

export const HesiaActionTypeSchema = z.enum([
  "create_task",
  "update_task",
  "bulk_update_tasks",
  "create_tag",
  "create_category",
  "draft_report_email",
  "create_calendar_event",
]);

export type HesiaActionType = z.infer<typeof HesiaActionTypeSchema>;

export const CreateTaskPayloadSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  notes: z.string().optional(),
  isPlanned: z.boolean(),
  status: TaskStatusSchema,
  tags: z.array(z.string()).default([]),
  category: z.string().optional(),
  durationMinutes: z.number().int().positive().optional(),
});

export type CreateTaskPayload = z.infer<typeof CreateTaskPayloadSchema>;

export const UpdateTaskPayloadSchema = z
  .object({
    taskId: z.string().uuid(),
    title: z.string().min(1).optional(),
    description: z.string().optional(),
    notes: z.string().optional(),
    status: TaskStatusSchema.optional(),
    isPlanned: z.boolean().optional(),
    tags: z.array(z.string()).optional(),
    category: z.string().optional(),
    durationMinutes: z.number().int().positive().optional(),
  })
  .refine(
    (data) =>
      data.title !== undefined ||
      data.description !== undefined ||
      data.notes !== undefined ||
      data.status !== undefined ||
      data.isPlanned !== undefined ||
      data.tags !== undefined ||
      data.category !== undefined ||
      data.durationMinutes !== undefined,
    { message: "At least one field to update is required" },
  );

export type UpdateTaskPayload = z.infer<typeof UpdateTaskPayloadSchema>;

export const BulkTaskUpdateItemSchema = z
  .object({
    taskId: z.string().uuid().optional(),
    titleMatch: z.string().min(1).optional(),
    tags: z.array(z.string()).optional(),
    category: z.string().optional(),
  })
  .refine((item) => Boolean(item.taskId?.trim() || item.titleMatch?.trim()), {
    message: "taskId or titleMatch is required",
  })
  .refine(
    (item) => item.tags !== undefined || item.category !== undefined,
    { message: "tags or category is required" },
  );

export const BulkUpdateTasksPayloadSchema = z.object({
  updates: z.array(BulkTaskUpdateItemSchema).min(1).max(40),
});

export type BulkUpdateTasksPayload = z.infer<
  typeof BulkUpdateTasksPayloadSchema
>;

export const CreateTagPayloadSchema = z.object({
  name: z.string().min(1).max(60),
  colorHex: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional(),
});

export type CreateTagPayload = z.infer<typeof CreateTagPayloadSchema>;

export const CreateCategoryPayloadSchema = z.object({
  name: z.string().min(1).max(60),
  colorHex: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional(),
});

export type CreateCategoryPayload = z.infer<typeof CreateCategoryPayloadSchema>;

export const DraftReportEmailPayloadSchema = z.object({
  subject: z.string().min(1),
  body: z.string().min(1),
  recipientHint: z.string().optional(),
  weekStart: z.string().optional(),
  tone: z.enum(["professional", "casual", "brief"]).optional(),
});

export type DraftReportEmailPayload = z.infer<
  typeof DraftReportEmailPayloadSchema
>;

export const CreateCalendarEventPayloadSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  startAt: z.string().min(1),
  endAt: z.string().optional(),
  location: z.string().optional(),
  allDay: z.boolean().optional(),
  timezone: z.string().optional(),
});

export type CreateCalendarEventPayload = z.infer<
  typeof CreateCalendarEventPayloadSchema
>;

export const CreateTaskActionSchema = z.object({
  type: z.literal("create_task"),
  version: z.literal(HESIA_ACTIONS_VERSION),
  payload: CreateTaskPayloadSchema,
});

export const UpdateTaskActionSchema = z.object({
  type: z.literal("update_task"),
  version: z.literal(HESIA_ACTIONS_VERSION),
  payload: UpdateTaskPayloadSchema,
});

export const BulkUpdateTasksActionSchema = z.object({
  type: z.literal("bulk_update_tasks"),
  version: z.literal(HESIA_ACTIONS_VERSION),
  payload: BulkUpdateTasksPayloadSchema,
});

export const CreateTagActionSchema = z.object({
  type: z.literal("create_tag"),
  version: z.literal(HESIA_ACTIONS_VERSION),
  payload: CreateTagPayloadSchema,
});

export const CreateCategoryActionSchema = z.object({
  type: z.literal("create_category"),
  version: z.literal(HESIA_ACTIONS_VERSION),
  payload: CreateCategoryPayloadSchema,
});

export const DraftReportEmailActionSchema = z.object({
  type: z.literal("draft_report_email"),
  version: z.literal(HESIA_ACTIONS_VERSION),
  payload: DraftReportEmailPayloadSchema,
});

export const CreateCalendarEventActionSchema = z.object({
  type: z.literal("create_calendar_event"),
  version: z.literal(HESIA_ACTIONS_VERSION),
  payload: CreateCalendarEventPayloadSchema,
});

export const HesiaActionSchema = z.discriminatedUnion("type", [
  CreateTaskActionSchema,
  UpdateTaskActionSchema,
  BulkUpdateTasksActionSchema,
  CreateTagActionSchema,
  CreateCategoryActionSchema,
  DraftReportEmailActionSchema,
  CreateCalendarEventActionSchema,
]);

export type HesiaAction = z.infer<typeof HesiaActionSchema>;

export type CreateTaskAction = z.infer<typeof CreateTaskActionSchema>;
export type UpdateTaskAction = z.infer<typeof UpdateTaskActionSchema>;
export type BulkUpdateTasksAction = z.infer<
  typeof BulkUpdateTasksActionSchema
>;
export type CreateTagAction = z.infer<typeof CreateTagActionSchema>;
export type CreateCategoryAction = z.infer<typeof CreateCategoryActionSchema>;
export type DraftReportEmailAction = z.infer<
  typeof DraftReportEmailActionSchema
>;
export type CreateCalendarEventAction = z.infer<
  typeof CreateCalendarEventActionSchema
>;