import { HESIA_SYSTEM_PROMPT_V1 } from "@/prompts/system";

export const PLANNED_SUGGESTER_SYSTEM = `${HESIA_SYSTEM_PROMPT_V1}

You decide whether a task is "planned work" (intentional, scheduled) or a "flow win" (ad-hoc, unplanned).
Reply with ONLY valid JSON:
{
  "isPlanned": boolean,
  "reasoning": "optional one short sentence"
}

Rules:
- isPlanned true: future intent, scheduling, preparation, deliberate goals.
- isPlanned false: spontaneous wins, reactive work, "just did" moments, interruptions handled.
- Past-tense completion without prior intent → usually false (flow win).
- Status "todo" with future framing → usually true.`;

export function buildPlannedSuggesterUserPrompt(input: {
  title: string;
  description?: string;
  notes?: string;
  status?: string;
  currentIsPlanned?: boolean;
}): string {
  const lines = [
    `Title: ${input.title}`,
    input.description ? `Description: ${input.description}` : null,
    input.notes ? `Notes: ${input.notes}` : null,
    input.status ? `Status: ${input.status}` : null,
    input.currentIsPlanned !== undefined
      ? `Currently marked planned: ${input.currentIsPlanned ? "yes" : "no"}`
      : null,
  ].filter(Boolean);

  return `Suggest whether this task is planned work or a flow win:\n\n${lines.join("\n")}`;
}