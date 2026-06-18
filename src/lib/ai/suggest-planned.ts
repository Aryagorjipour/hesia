import { fetchJsonCompletion } from "@/lib/ai/json-completion";
import { parseAiJsonResponse } from "@/lib/ai/parse-json-response";
import {
  buildPlannedSuggesterUserPrompt,
  PLANNED_SUGGESTER_SYSTEM,
} from "@/prompts/planned-suggester";
import {
  PlannedSuggestionSchema,
  type PlannedSuggestion,
  type TaskSuggestionContext,
} from "@/types/ai-suggestions";
import type { AppSettings } from "@/types/settings";

export interface SuggestPlannedInput extends TaskSuggestionContext {
  currentIsPlanned?: boolean;
}

export async function suggestPlanned(
  settings: AppSettings | undefined,
  input: SuggestPlannedInput,
): Promise<PlannedSuggestion> {
  const raw = await fetchJsonCompletion(settings, "planned-suggest", [
    { role: "system", content: PLANNED_SUGGESTER_SYSTEM },
    {
      role: "user",
      content: buildPlannedSuggesterUserPrompt({
        title: input.title,
        description: input.description,
        notes: input.notes,
        status: input.status,
        currentIsPlanned: input.currentIsPlanned,
      }),
    },
  ]);

  return parseAiJsonResponse(raw, PlannedSuggestionSchema);
}