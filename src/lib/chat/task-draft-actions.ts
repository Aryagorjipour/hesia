import type { AiTaskDraft } from "@/lib/ai/structured-output";
import {
  addTaskSuggestionToBoard,
  taskSuggestionFromDraft,
} from "@/lib/chat/task-suggestion";

export async function addTaskDraftToBoard(draft: AiTaskDraft): Promise<void> {
  await addTaskSuggestionToBoard(taskSuggestionFromDraft(draft));
}