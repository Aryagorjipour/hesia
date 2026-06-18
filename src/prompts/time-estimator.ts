import { HESIA_SYSTEM_PROMPT_V1 } from "@/prompts/system";

export const TIME_ESTIMATOR_SYSTEM = `${HESIA_SYSTEM_PROMPT_V1}

You estimate how long a task likely took or will take, in minutes.
Reply with ONLY valid JSON:
{
  "durationMinutes": positive integer,
  "reasoning": "optional one short sentence"
}

Rules:
- Estimate realistic minutes for one focused session or completion window.
- Past/completed work: infer from context (e.g. "25min yoga" → 25).
- Future/planned work: give a reasonable planning estimate.
- Typical range: 5–240 minutes unless clearly a multi-hour project.
- Round to sensible increments (5, 10, 15, 25, 30, 45, 60, 90, 120).`;

export function buildTimeEstimatorUserPrompt(input: {
  title: string;
  description?: string;
  notes?: string;
  status?: string;
  isPlanned?: boolean;
  currentDurationMinutes?: number;
}): string {
  const lines = [
    `Title: ${input.title}`,
    input.description ? `Description: ${input.description}` : null,
    input.notes ? `Notes: ${input.notes}` : null,
    input.status ? `Status: ${input.status}` : null,
    input.isPlanned !== undefined
      ? `Planned work: ${input.isPlanned ? "yes" : "no (flow win)"}`
      : null,
    input.currentDurationMinutes
      ? `Current duration: ${input.currentDurationMinutes} min`
      : "Current duration: (not set)",
  ].filter(Boolean);

  return `Estimate duration in minutes for this task:\n\n${lines.join("\n")}`;
}