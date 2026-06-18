import { fetchJsonCompletion } from "@/lib/ai/json-completion";
import { parseAiJsonResponse } from "@/lib/ai/parse-json-response";
import {
  buildTimeEstimatorUserPrompt,
  TIME_ESTIMATOR_SYSTEM,
} from "@/prompts/time-estimator";
import {
  TimeEstimateSuggestionSchema,
  type TimeEstimateSuggestion,
  type TaskSuggestionContext,
} from "@/types/ai-suggestions";
import type { AppSettings } from "@/types/settings";

export interface EstimateTimeInput extends TaskSuggestionContext {
  currentDurationMinutes?: number;
}

export async function estimateTime(
  settings: AppSettings | undefined,
  input: EstimateTimeInput,
): Promise<TimeEstimateSuggestion> {
  const raw = await fetchJsonCompletion(settings, "time-estimate", [
    { role: "system", content: TIME_ESTIMATOR_SYSTEM },
    {
      role: "user",
      content: buildTimeEstimatorUserPrompt({
        title: input.title,
        description: input.description,
        notes: input.notes,
        status: input.status,
        isPlanned: input.isPlanned,
        currentDurationMinutes: input.currentDurationMinutes,
      }),
    },
  ]);

  return parseAiJsonResponse(raw, TimeEstimateSuggestionSchema);
}