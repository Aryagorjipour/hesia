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
import { createTask } from "@/lib/db/mutations/tasks";
import { todayISO } from "@/lib/utils/board-dates";
import { COLUMN_LABELS } from "@/types/task";
import type {
  HesiaAction,
  CreateTaskAction,
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