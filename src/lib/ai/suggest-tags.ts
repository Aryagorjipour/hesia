import { fetchJsonCompletion } from "@/lib/ai/json-completion";
import { parseAiJsonResponse } from "@/lib/ai/parse-json-response";
import {
  buildTagSuggesterUserPrompt,
  TAG_SUGGESTER_SYSTEM,
} from "@/prompts/tag-suggester";
import {
  TagSuggestionSchema,
  type TagSuggestion,
  type TaskSuggestionContext,
} from "@/types/ai-suggestions";
import type { AppSettings } from "@/types/settings";

export interface SuggestTagsInput extends TaskSuggestionContext {
  currentTags: string[];
  availableTags: string[];
}

export async function suggestTags(
  settings: AppSettings | undefined,
  input: SuggestTagsInput,
): Promise<TagSuggestion> {
  const raw = await fetchJsonCompletion(settings, "tagging", [
    { role: "system", content: TAG_SUGGESTER_SYSTEM },
    {
      role: "user",
      content: buildTagSuggesterUserPrompt({
        title: input.title,
        description: input.description,
        notes: input.notes,
        status: input.status,
        isPlanned: input.isPlanned,
        currentTags: input.currentTags,
        availableTags: input.availableTags,
      }),
    },
  ]);

  const result = parseAiJsonResponse(raw, TagSuggestionSchema);
  const allowed = new Set(input.availableTags);
  return {
    ...result,
    tags: result.tags.filter((t) => allowed.has(t)),
  };
}