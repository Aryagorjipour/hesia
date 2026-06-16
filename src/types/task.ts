import { z } from "zod";

export const TaskStatusSchema = z.enum([
  "inbox",
  "todo",
  "doing",
  "done",
  "archived",
]);

export type TaskStatus = z.infer<typeof TaskStatusSchema>;

export const DayTransitionSchema = z.object({
  fromBoardDate: z.string(),
  toBoardDate: z.string(),
  fromStatus: TaskStatusSchema,
  toStatus: TaskStatusSchema,
  at: z.string().datetime(),
  reason: z.enum(["carry_forward", "manual"]),
});

export type DayTransition = z.infer<typeof DayTransitionSchema>;

export const TaskSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1),
  description: z.string().optional(),
  status: TaskStatusSchema,
  isPlanned: z.boolean(),
  tags: z.array(z.string()),
  category: z.string().optional(),
  createdAt: z.string().datetime(),
  completedAt: z.string().datetime().optional(),
  durationMinutes: z.number().int().positive().optional(),
  notes: z.string().optional(),
  sortOrder: z.number(),
  /** yyyy-MM-dd — day board for non-inbox tasks; inbox is always global */
  boardDate: z.string().optional(),
  /** First day this task entered todo/doing — for accurate reports */
  startedOnBoardDate: z.string().optional(),
  /** Audit trail when tasks move between days */
  dayTransitions: z.array(DayTransitionSchema).optional(),
  aiEnriched: z
    .object({
      suggestedAt: z.string().datetime(),
      provider: z.string().optional(),
    })
    .optional(),
});

export type Task = z.infer<typeof TaskSchema>;

export const DEFAULT_COLUMNS: TaskStatus[] = [
  "inbox",
  "todo",
  "doing",
  "done",
  "archived",
];

export const COLUMN_LABELS: Record<TaskStatus, string> = {
  inbox: "Inbox",
  todo: "To Do",
  doing: "In Progress",
  done: "Done",
  archived: "Archived",
};

/** Statuses that can be carried to the next day */
export const CARRY_FORWARD_STATUSES: TaskStatus[] = ["todo", "doing"];