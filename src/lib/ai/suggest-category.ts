import { fetchJsonCompletion } from "@/lib/ai/json-completion";
import { parseAiJsonResponse } from "@/lib/ai/parse-json-response";
import {
  buildCategorySuggesterUserPrompt,
  CATEGORY_SUGGESTER_SYSTEM,
} from "@/prompts/category-suggester";
import {
  CategorySuggestionSchema,
  type CategorySuggestion,
  type TaskSuggestionContext,
} from "@/types/ai-suggestions";
import type { AppSettings } from "@/types/settings";

export interface SuggestCategoryInput extends TaskSuggestionContext {
  currentCategory?: string;
  availableCategories: string[];
}

export async function suggestCategory(
  settings: AppSettings | undefined,
  input: SuggestCategoryInput,
): Promise<CategorySuggestion> {
  const raw = await fetchJsonCompletion(settings, "categorization", [
    { role: "system", content: CATEGORY_SUGGESTER_SYSTEM },
    {
      role: "user",
      content: buildCategorySuggesterUserPrompt({
        title: input.title,
        description: input.description,
        notes: input.notes,
        status: input.status,
        tags: input.tags,
        currentCategory: input.currentCategory,
        availableCategories: input.availableCategories,
      }),
    },
  ]);

  const result = parseAiJsonResponse(raw, CategorySuggestionSchema);
  const allowed = new Set(input.availableCategories);
  return {
    ...result,
    category:
      result.category && allowed.has(result.category) ? result.category : null,
  };
}