import type { AiTaskDraft } from "@/lib/ai/structured-output";
import { createTask } from "@/lib/db/mutations/tasks";
import { todayISO } from "@/lib/utils/board-dates";

export async function addTaskDraftToBoard(draft: AiTaskDraft): Promise<void> {
  await createTask({
    title: draft.title,
    description: draft.description,
    notes: draft.notes,
    status: draft.status === "archived" ? "todo" : draft.status,
    isPlanned: draft.isPlanned,
    tags: draft.tags,
    category: draft.category,
    durationMinutes: draft.durationMinutes,
    boardDate: draft.status === "inbox" ? undefined : todayISO(),
  });
}