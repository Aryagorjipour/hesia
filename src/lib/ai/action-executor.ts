import { v4 as uuidv4 } from "uuid";
import { addHours, format, isValid, parseISO } from "date-fns";
import {
  buildGoogleCalendarUrl,
} from "@/lib/calendar/google-calendar-link";
import {
  buildIcsCalendar,
  downloadIcsFile,
} from "@/lib/calendar/ics-builder";
import { buildMailtoUrl } from "@/lib/email/draft-report-email";
import { createCategory } from "@/lib/db/mutations/categories";
import { createTag } from "@/lib/db/mutations/tags";
import {
  createTask,
  ensureCategoryExists,
  ensureTagExists,
  updateTask,
} from "@/lib/db/mutations/tasks";
import { db } from "@/lib/db/schema";
import { todayISO } from "@/lib/utils/board-dates";
import { COLUMN_LABELS } from "@/types/task";
import type {
  HesiaAction,
  CreateTaskAction,
  UpdateTaskAction,
  CreateTagAction,
  CreateCategoryAction,
  DraftReportEmailAction,
  CreateCalendarEventAction,
} from "@/types/ai-actions";

export interface ActionPreview {
  action: HesiaAction;
  title: string;
  summary: string;
  detailLines: string[];
  canExecute: boolean;
  executeLabel: string;
}

export interface ActionExecutionResult {
  ok: boolean;
  message: string;
}

function formatDateTime(value: string): string {
  try {
    const date = parseISO(value);
    if (!isValid(date)) return value;
    return format(date, "EEE, MMM d · h:mm a");
  } catch {
    return value;
  }
}

export function buildActionPreview(action: HesiaAction): ActionPreview {
  switch (action.type) {
    case "create_task":
      return buildCreateTaskPreview(action);
    case "update_task":
      return buildUpdateTaskPreview(action);
    case "create_tag":
      return buildCreateTagPreview(action);
    case "create_category":
      return buildCreateCategoryPreview(action);
    case "draft_report_email":
      return buildDraftReportEmailPreview(action);
    case "create_calendar_event":
      return buildCreateCalendarEventPreview(action);
  }
}

function buildCreateTaskPreview(action: CreateTaskAction): ActionPreview {
  const { payload } = action;
  const detailLines = [
    `Column: ${COLUMN_LABELS[payload.status]}`,
    `Type: ${payload.isPlanned ? "Planned" : "Flow win"}`,
  ];

  if (payload.category) detailLines.push(`Category: ${payload.category}`);
  if (payload.tags.length > 0) {
    detailLines.push(`Tags: ${payload.tags.join(", ")}`);
  }
  if (payload.durationMinutes) {
    detailLines.push(`Duration: ${payload.durationMinutes} min`);
  }
  if (payload.description) {
    detailLines.push(payload.description);
  }

  return {
    action,
    title: payload.title,
    summary: "Add this task to your board",
    detailLines,
    canExecute: true,
    executeLabel: "Add to board",
  };
}

function buildUpdateTaskPreview(action: UpdateTaskAction): ActionPreview {
  const { payload } = action;
  const detailLines: string[] = [`Task id: ${payload.taskId}`];

  if (payload.title) detailLines.push(`Title → ${payload.title}`);
  if (payload.status) {
    detailLines.push(`Column → ${COLUMN_LABELS[payload.status]}`);
  }
  if (payload.isPlanned !== undefined) {
    detailLines.push(
      `Type → ${payload.isPlanned ? "Planned" : "Flow win"}`,
    );
  }
  if (payload.category !== undefined) {
    detailLines.push(
      `Category → ${payload.category.trim() || "(none)"}`,
    );
  }
  if (payload.tags) {
    detailLines.push(`Tags → ${payload.tags.join(", ") || "(none)"}`);
  }
  if (payload.durationMinutes !== undefined) {
    detailLines.push(`Duration → ${payload.durationMinutes} min`);
  }
  if (payload.description !== undefined) {
    detailLines.push(payload.description || "(clear description)");
  }
  if (payload.notes !== undefined) {
    detailLines.push(payload.notes || "(clear notes)");
  }

  return {
    action,
    title: "Update task",
    summary: "Apply these changes after you confirm",
    detailLines,
    canExecute: true,
    executeLabel: "Save changes",
  };
}

function buildCreateTagPreview(action: CreateTagAction): ActionPreview {
  const { payload } = action;
  return {
    action,
    title: payload.name,
    summary: "Create a new tag for your board",
    detailLines: [
      ...(payload.colorHex ? [`Color: ${payload.colorHex}`] : []),
    ],
    canExecute: true,
    executeLabel: "Create tag",
  };
}

function buildCreateCategoryPreview(
  action: CreateCategoryAction,
): ActionPreview {
  const { payload } = action;
  return {
    action,
    title: payload.name,
    summary: "Create a new category for tasks",
    detailLines: [
      ...(payload.colorHex ? [`Color: ${payload.colorHex}`] : []),
    ],
    canExecute: true,
    executeLabel: "Create category",
  };
}

function buildDraftReportEmailPreview(
  action: DraftReportEmailAction,
): ActionPreview {
  const { payload } = action;
  const detailLines = [
    `Subject: ${payload.subject}`,
    ...(payload.recipientHint
      ? [`To: ${payload.recipientHint}`]
      : []),
    ...(payload.weekStart ? [`Week: ${payload.weekStart}`] : []),
    ...(payload.tone ? [`Tone: ${payload.tone}`] : []),
    "",
    payload.body,
  ];

  return {
    action,
    title: "Weekly report email",
    summary: "Preview of a shareable progress email",
    detailLines,
    canExecute: true,
    executeLabel: "Open in mail app",
  };
}

function buildCreateCalendarEventPreview(
  action: CreateCalendarEventAction,
): ActionPreview {
  const { payload } = action;
  const detailLines = [
    `When: ${payload.allDay ? formatDateTime(payload.startAt).split(" · ")[0] + " (all day)" : formatDateTime(payload.startAt)}`,
    ...(payload.endAt
      ? [`Ends: ${formatDateTime(payload.endAt)}`]
      : []),
    ...(payload.location ? [`Location: ${payload.location}`] : []),
    ...(payload.timezone ? [`Timezone: ${payload.timezone}`] : []),
    ...(payload.description ? ["", payload.description] : []),
  ];

  return {
    action,
    title: payload.title,
    summary: "Preview of a calendar event",
    detailLines,
    canExecute: true,
    executeLabel: "Download .ics",
  };
}

export async function executeConfirmedAction(
  action: HesiaAction,
): Promise<ActionExecutionResult> {
  switch (action.type) {
    case "create_task":
      return executeCreateTask(action);
    case "update_task":
      return executeUpdateTask(action);
    case "create_tag":
      return executeCreateTag(action);
    case "create_category":
      return executeCreateCategory(action);
    case "draft_report_email":
      return executeDraftReportEmail(action);
    case "create_calendar_event":
      return executeCreateCalendarEvent(action);
  }
}

async function executeDraftReportEmail(
  action: DraftReportEmailAction,
): Promise<ActionExecutionResult> {
  const { payload } = action;
  const mailto = buildMailtoUrl(payload.recipientHint ?? "", {
    subject: payload.subject,
    text: payload.body,
    html: "",
  });
  if (typeof window !== "undefined") {
    window.location.href = mailto;
  }
  return {
    ok: true,
    message: "Opened your mail app — review and send from there",
  };
}

async function executeCreateCalendarEvent(
  action: CreateCalendarEventAction,
): Promise<ActionExecutionResult> {
  const { payload } = action;
  const start = parseISO(payload.startAt);
  if (!isValid(start)) {
    return { ok: false, message: "Invalid start date" };
  }
  const end = payload.endAt
    ? parseISO(payload.endAt)
    : payload.allDay
      ? addHours(start, 24)
      : addHours(start, 1);
  const timezone = payload.timezone ?? "Asia/Tehran";

  const icsContent = buildIcsCalendar([
    {
      uid: `${uuidv4()}@hesia.local`,
      title: payload.title,
      description: payload.description,
      location: payload.location,
      start,
      end: isValid(end) ? end : addHours(start, 1),
      timezone,
    },
  ]);

  downloadIcsFile(
    `hesia-${format(start, "yyyy-MM-dd")}.ics`,
    icsContent,
  );

  const googleUrl = buildGoogleCalendarUrl({
    title: payload.title,
    description: payload.description,
    location: payload.location,
    start,
    end: isValid(end) ? end : addHours(start, 1),
  });

  if (typeof window !== "undefined") {
    window.open(googleUrl, "_blank", "noopener,noreferrer");
  }

  return {
    ok: true,
    message: "Downloaded .ics and opened Google Calendar",
  };
}

async function executeCreateTask(
  action: CreateTaskAction,
): Promise<ActionExecutionResult> {
  const { payload } = action;

  try {
    for (const tag of payload.tags) {
      await ensureTagExists(tag);
    }
    if (payload.category) {
      await ensureCategoryExists(payload.category);
    }

    await createTask({
      title: payload.title,
      description: payload.description,
      notes: payload.notes,
      status: payload.status === "archived" ? "todo" : payload.status,
      isPlanned: payload.isPlanned,
      tags: payload.tags,
      category: payload.category,
      durationMinutes: payload.durationMinutes,
      boardDate:
        payload.status === "inbox" ? undefined : todayISO(),
    });

    return { ok: true, message: "Task added to your board" };
  } catch (err) {
    return {
      ok: false,
      message:
        err instanceof Error ? err.message : "Could not create task",
    };
  }
}

async function executeUpdateTask(
  action: UpdateTaskAction,
): Promise<ActionExecutionResult> {
  const { payload } = action;
  const { taskId, ...updates } = payload;

  try {
    const existing = await db.tasks.get(taskId);
    if (!existing) {
      return { ok: false, message: "Task not found — it may have been deleted" };
    }

    if (updates.tags) {
      for (const tag of updates.tags) {
        await ensureTagExists(tag);
      }
    }
    if (updates.category?.trim()) {
      await ensureCategoryExists(updates.category);
    }

    const patch: Parameters<typeof updateTask>[1] = { ...updates };
    if (updates.category !== undefined) {
      patch.category = updates.category.trim() || undefined;
    }

    await updateTask(taskId, patch);

    return {
      ok: true,
      message: `"${existing.title}" updated`,
    };
  } catch (err) {
    return {
      ok: false,
      message:
        err instanceof Error ? err.message : "Could not update task",
    };
  }
}

async function executeCreateTag(
  action: CreateTagAction,
): Promise<ActionExecutionResult> {
  const { payload } = action;
  try {
    await createTag(payload.name, payload.colorHex);
    return {
      ok: true,
      message: `Tag "${payload.name}" created`,
    };
  } catch (err) {
    return {
      ok: false,
      message:
        err instanceof Error ? err.message : "Could not create tag",
    };
  }
}

async function executeCreateCategory(
  action: CreateCategoryAction,
): Promise<ActionExecutionResult> {
  const { payload } = action;
  try {
    await createCategory(payload.name, payload.colorHex);
    return {
      ok: true,
      message: `Category "${payload.name}" created`,
    };
  } catch (err) {
    return {
      ok: false,
      message:
        err instanceof Error ? err.message : "Could not create category",
    };
  }
}