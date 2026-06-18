import { HESIA_SYSTEM_PROMPT_V1 } from "@/prompts/system";

export const CATEGORY_SUGGESTER_SYSTEM = `${HESIA_SYSTEM_PROMPT_V1}

You suggest a category for a single task on a personal progress board.
Reply with ONLY valid JSON:
{
  "category": "existing category name or null",
  "reasoning": "optional one short sentence"
}

Rules:
- Pick at most one category from the provided list, or null if none fits.
- Use ONLY category names from the provided list — never invent new ones.
- Categories group related work — choose the best thematic fit.`;

export function buildCategorySuggesterUserPrompt(input: {
  title: string;
  description?: string;
  notes?: string;
  status?: string;
  tags?: string[];
  currentCategory?: string;
  availableCategories: string[];
}): string {
  const lines = [
    `Title: ${input.title}`,
    input.description ? `Description: ${input.description}` : null,
    input.notes ? `Notes: ${input.notes}` : null,
    input.status ? `Status: ${input.status}` : null,
    input.tags?.length ? `Tags: ${input.tags.join(", ")}` : null,
    `Current category: ${input.currentCategory ?? "(none)"}`,
    `Available categories: ${input.availableCategories.join(", ") || "(none)"}`,
  ].filter(Boolean);

  return `Suggest a category for this task:\n\n${lines.join("\n")}`;
}