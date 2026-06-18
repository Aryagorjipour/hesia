import type { AiTaskDraft } from "@/lib/ai/structured-output";
import {
  createTask,
  ensureCategoryExists,
  ensureTagExists,
} from "@/lib/db/mutations/tasks";
import { todayISO } from "@/lib/utils/board-dates";
import type { CreateTaskPayload } from "@/types/ai-actions";
import type { TaskStatus } from "@/types/task";

export interface TaskSuggestionFields {
  title: string;
  description?: string;
  notes?: string;
  status: TaskStatus;
  isPlanned: boolean;
  tags: string[];
  category?: string;
  durationMinutes?: number;
}

export function taskSuggestionFromDraft(draft: AiTaskDraft): TaskSuggestionFields {
  return {
    title: draft.title,
    description: draft.description,
    notes: draft.notes,
    status: draft.status === "archived" ? "todo" : draft.status,
    isPlanned: draft.isPlanned,
    tags: draft.tags ?? [],
    category: draft.category,
    durationMinutes: draft.durationMinutes,
  };
}

export function taskSuggestionFromCreateTaskPayload(
  payload: CreateTaskPayload,
): TaskSuggestionFields {
  return {
    title: payload.title,
    description: payload.description,
    notes: payload.notes,
    status: payload.status === "archived" ? "todo" : payload.status,
    isPlanned: payload.isPlanned,
    tags: payload.tags ?? [],
    category: payload.category,
    durationMinutes: payload.durationMinutes,
  };
}

export async function addTaskSuggestionToBoard(
  fields: TaskSuggestionFields,
): Promise<void> {
  for (const tag of fields.tags) {
    await ensureTagExists(tag);
  }
  if (fields.category) {
    await ensureCategoryExists(fields.category);
  }

  await createTask({
    title: fields.title.trim(),
    description: fields.description?.trim() || undefined,
    notes: fields.notes?.trim() || undefined,
    status: fields.status,
    isPlanned: fields.isPlanned,
    tags: fields.tags,
    category: fields.category?.trim() || undefined,
    durationMinutes: fields.durationMinutes,
    boardDate: fields.status === "inbox" ? undefined : todayISO(),
  });
}