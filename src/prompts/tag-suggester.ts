import { HESIA_SYSTEM_PROMPT_V1 } from "@/prompts/system";

export const TAG_SUGGESTER_SYSTEM = `${HESIA_SYSTEM_PROMPT_V1}

You suggest tags for a single task on a personal progress board.
Reply with ONLY valid JSON:
{
  "tags": ["existing tag names only"],
  "reasoning": "optional one short sentence"
}

Rules:
- Pick 0–4 tags that best fit the task content and intent.
- Use ONLY tag names from the provided list — never invent new tags.
- Prefer tags the user already uses for similar work.
- Leave tags empty if nothing fits well.`;

export function buildTagSuggesterUserPrompt(input: {
  title: string;
  description?: string;
  notes?: string;
  status?: string;
  isPlanned?: boolean;
  currentTags: string[];
  availableTags: string[];
}): string {
  const lines = [
    `Title: ${input.title}`,
    input.description ? `Description: ${input.description}` : null,
    input.notes ? `Notes: ${input.notes}` : null,
    input.status ? `Status: ${input.status}` : null,
    input.isPlanned !== undefined
      ? `Planned work: ${input.isPlanned ? "yes" : "no (flow win)"}`
      : null,
    `Current tags: ${input.currentTags.join(", ") || "(none)"}`,
    `Available tags: ${input.availableTags.join(", ") || "(none)"}`,
  ].filter(Boolean);

  return `Suggest tags for this task:\n\n${lines.join("\n")}`;
}