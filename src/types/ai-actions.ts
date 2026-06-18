import { z } from "zod";
import { TaskStatusSchema } from "./task";

export const HESIA_ACTIONS_VERSION = "hesia-actions/v1" as const;

export const HesiaActionTypeSchema = z.enum([
  "create_task",
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
  DraftReportEmailActionSchema,
  CreateCalendarEventActionSchema,
]);

export type HesiaAction = z.infer<typeof HesiaActionSchema>;

export type CreateTaskAction = z.infer<typeof CreateTaskActionSchema>;
export type DraftReportEmailAction = z.infer<
  typeof DraftReportEmailActionSchema
>;
export type CreateCalendarEventAction = z.infer<
  typeof CreateCalendarEventActionSchema
>;