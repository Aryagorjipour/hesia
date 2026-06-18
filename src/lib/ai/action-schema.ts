import { z } from "zod";
import type { AiToolDefinition } from "./ai-service";
import {
  HESIA_ACTIONS_VERSION,
  CreateTaskPayloadSchema,
  UpdateTaskPayloadSchema,
  BulkUpdateTasksPayloadSchema,
  CreateTagPayloadSchema,
  CreateCategoryPayloadSchema,
  DraftReportEmailPayloadSchema,
  CreateCalendarEventPayloadSchema,
  HesiaActionSchema,
  type HesiaAction,
  type HesiaActionType,
} from "@/types/ai-actions";

const TASK_STATUS_ENUM = ["inbox", "todo", "doing", "done", "archived"] as const;

export const HESIA_ACTION_TOOLS: AiToolDefinition[] = [
  {
    type: "function",
    function: {
      name: "create_task",
      description:
        "Propose a new task for the user's kanban board. Requires user confirmation before creation.",
      parameters: {
        type: "object",
        required: ["title", "isPlanned", "status"],
        properties: {
          title: { type: "string", description: "Short task title" },
          description: {
            type: "string",
            description: "Optional longer description",
          },
          notes: { type: "string", description: "Optional notes" },
          isPlanned: {
            type: "boolean",
            description: "True if planned in advance, false for flow wins",
          },
          status: {
            type: "string",
            enum: TASK_STATUS_ENUM,
            description: "Initial column on the board",
          },
          tags: {
            type: "array",
            items: { type: "string" },
            description:
              "Tag names to assign. New names are created automatically when the user confirms.",
          },
          category: {
            type: "string",
            description:
              "Category name. New names are created automatically when the user confirms.",
          },
          durationMinutes: {
            type: "integer",
            description: "Optional duration in minutes",
          },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_task",
      description:
        "Propose changes to an existing task. Use taskId from context. Requires user confirmation.",
      parameters: {
        type: "object",
        required: ["taskId"],
        properties: {
          taskId: {
            type: "string",
            description: "UUID of the task to update (from context)",
          },
          title: { type: "string", description: "New title" },
          description: { type: "string", description: "New description" },
          notes: { type: "string", description: "New notes" },
          status: {
            type: "string",
            enum: TASK_STATUS_ENUM,
            description: "New column",
          },
          isPlanned: {
            type: "boolean",
            description: "Planned vs flow win",
          },
          tags: {
            type: "array",
            items: { type: "string" },
            description:
              "Full replacement tag list. New tag names are created on confirm.",
          },
          category: {
            type: "string",
            description:
              "New category. New names are created on confirm. Empty string clears.",
          },
          durationMinutes: {
            type: "integer",
            description: "Duration in minutes",
          },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "bulk_update_tasks",
      description:
        "Assign tags and/or categories to multiple existing tasks at once. Use when the user wants labels applied after you suggested them. Requires user confirmation.",
      parameters: {
        type: "object",
        required: ["updates"],
        properties: {
          updates: {
            type: "array",
            description: "One entry per task to update",
            items: {
              type: "object",
              properties: {
                taskId: {
                  type: "string",
                  description: "Task UUID from context (preferred)",
                },
                titleMatch: {
                  type: "string",
                  description:
                    "Substring of task title if id unknown, e.g. barbershop",
                },
                tags: {
                  type: "array",
                  items: { type: "string" },
                  description: "Full tag list for this task",
                },
                category: {
                  type: "string",
                  description: "Category name (created if new)",
                },
              },
            },
          },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_tag",
      description:
        "Add a new tag to the user's tag library for use on tasks. Requires user confirmation.",
      parameters: {
        type: "object",
        required: ["name"],
        properties: {
          name: { type: "string", description: "Tag name" },
          colorHex: {
            type: "string",
            description: "Optional hex color, e.g. #6366f1",
          },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_category",
      description:
        "Add a new category to the user's library. Requires user confirmation.",
      parameters: {
        type: "object",
        required: ["name"],
        properties: {
          name: { type: "string", description: "Category name" },
          colorHex: {
            type: "string",
            description: "Optional hex color, e.g. #10b981",
          },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "draft_report_email",
      description:
        "Draft an email sharing the user's weekly progress report. Preview only until the user confirms.",
      parameters: {
        type: "object",
        required: ["subject", "body"],
        properties: {
          subject: { type: "string", description: "Email subject line" },
          body: { type: "string", description: "Full email body in plain text" },
          recipientHint: {
            type: "string",
            description: "Suggested recipient, e.g. manager or teammate",
          },
          weekStart: {
            type: "string",
            description: "Week start date (yyyy-MM-dd) the report covers",
          },
          tone: {
            type: "string",
            enum: ["professional", "casual", "brief"],
            description: "Writing tone",
          },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_calendar_event",
      description:
        "Propose a calendar event for the user. Preview only until the user confirms.",
      parameters: {
        type: "object",
        required: ["title", "startAt"],
        properties: {
          title: { type: "string", description: "Event title" },
          description: { type: "string", description: "Optional details" },
          startAt: {
            type: "string",
            description: "ISO 8601 start datetime",
          },
          endAt: {
            type: "string",
            description: "ISO 8601 end datetime",
          },
          location: { type: "string", description: "Optional location" },
          allDay: {
            type: "boolean",
            description: "Whether this is an all-day event",
          },
          timezone: {
            type: "string",
            description: "IANA timezone, e.g. America/New_York",
          },
        },
        additionalProperties: false,
      },
    },
  },
];

const ToolNameSchema = z.enum([
  "create_task",
  "update_task",
  "bulk_update_tasks",
  "create_tag",
  "create_category",
  "draft_report_email",
  "create_calendar_event",
]);

export function parseToolCallToAction(
  name: string,
  argsJson: string,
): HesiaAction | null {
  const toolName = ToolNameSchema.safeParse(name);
  if (!toolName.success) return null;

  let raw: unknown;
  try {
    raw = JSON.parse(argsJson);
  } catch {
    return null;
  }

  return wrapPayloadAsAction(toolName.data, raw);
}

export function wrapPayloadAsAction(
  type: HesiaActionType,
  payload: unknown,
): HesiaAction | null {
  const version = HESIA_ACTIONS_VERSION;

  switch (type) {
    case "create_task": {
      const parsed = CreateTaskPayloadSchema.safeParse(payload);
      if (!parsed.success) return null;
      return { type, version, payload: parsed.data };
    }
    case "update_task": {
      const parsed = UpdateTaskPayloadSchema.safeParse(payload);
      if (!parsed.success) return null;
      return { type, version, payload: parsed.data };
    }
    case "bulk_update_tasks": {
      const parsed = BulkUpdateTasksPayloadSchema.safeParse(payload);
      if (!parsed.success) return null;
      return { type, version, payload: parsed.data };
    }
    case "create_tag": {
      const parsed = CreateTagPayloadSchema.safeParse(payload);
      if (!parsed.success) return null;
      return { type, version, payload: parsed.data };
    }
    case "create_category": {
      const parsed = CreateCategoryPayloadSchema.safeParse(payload);
      if (!parsed.success) return null;
      return { type, version, payload: parsed.data };
    }
    case "draft_report_email": {
      const parsed = DraftReportEmailPayloadSchema.safeParse(payload);
      if (!parsed.success) return null;
      return { type, version, payload: parsed.data };
    }
    case "create_calendar_event": {
      const parsed = CreateCalendarEventPayloadSchema.safeParse(payload);
      if (!parsed.success) return null;
      return { type, version, payload: parsed.data };
    }
    default:
      return null;
  }
}

export function parseHesiaActionJson(text: string): HesiaAction | null {
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;
  try {
    const parsed = JSON.parse(jsonMatch[0]);
    const result = HesiaActionSchema.safeParse(parsed);
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}