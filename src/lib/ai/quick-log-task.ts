import { streamChatCompletion } from "@/lib/ai/client";
import {
  AiTaskDraftSchema,
  type AiTaskDraft,
} from "@/lib/ai/structured-output";
import type { AiConfig } from "@/types/settings";
import type { TaskStatus } from "@/types/task";
import { COLUMN_LABELS } from "@/types/task";

export interface QuickLogTaskContext {
  boardDate: string;
  allowedStatuses: TaskStatus[];
  tagNames: string[];
  categoryNames: string[];
}

const QUICK_LOG_SYSTEM = `You turn a user's casual "what happened" log into a structured board task.
Reply with ONLY valid JSON matching this schema:
{
  "title": "short actionable title (required)",
  "description": "one-line summary if useful, else omit",
  "notes": "extra context preserved from the user's words, else omit",
  "status": "inbox|todo|doing|done",
  "isPlanned": boolean,
  "tags": ["existing tag names only"],
  "category": "existing category or omit",
  "durationMinutes": number or omit
}

Rules:
- Past-tense wins → status "done", isPlanned false. Future/planning → "todo", isPlanned true.
- Vague capture → status "inbox".
- title is the board card title, NOT the full user paragraph.
- description = brief summary; notes = longer original detail when needed.
- Only use tags/categories from the provided lists.`;

export async function generateTaskFromQuickLog(
  userText: string,
  aiConfig: AiConfig,
  context: QuickLogTaskContext,
): Promise<AiTaskDraft> {
  const compactConfig = { ...aiConfig, streaming: false };

  const userPrompt = `Board day: ${context.boardDate}
Allowed columns: ${context.allowedStatuses.map((s) => COLUMN_LABELS[s]).join(", ")}
Existing tags: ${context.tagNames.join(", ") || "(none)"}
Existing categories: ${context.categoryNames.join(", ") || "(none)"}

User said:
${userText.trim()}`;

  const raw = await new Promise<string>((resolve, reject) => {
    void streamChatCompletion(
      compactConfig,
      {
        messages: [
          { role: "system", content: QUICK_LOG_SYSTEM },
          { role: "user", content: userPrompt },
        ],
        jsonMode: true,
      },
      {
        onToken: () => {},
        onDone: resolve,
        onError: reject,
      },
    );
  });

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("AI did not return a valid task");
    parsed = JSON.parse(match[0]);
  }

  const result = AiTaskDraftSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error("AI returned an invalid task shape");
  }

  const draft = result.data;
  const status = context.allowedStatuses.includes(draft.status)
    ? draft.status
    : (context.allowedStatuses[0] ?? "inbox");

  return {
    ...draft,
    status,
    tags: draft.tags.filter((t) => context.tagNames.includes(t)),
    category:
      draft.category && context.categoryNames.includes(draft.category)
        ? draft.category
        : undefined,
  };
}