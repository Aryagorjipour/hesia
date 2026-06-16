import { parseAiTaskDraft, type AiTaskDraft } from "./structured-output";

const TASK_DRAFT_BLOCK_REGEX =
  /\[TASK DRAFT\]\s*([\s\S]+?)\s*\[\/TASK DRAFT\]/gi;

export function parseTaskDraftBlocks(text: string): AiTaskDraft[] {
  const results: AiTaskDraft[] = [];
  let match: RegExpExecArray | null;
  const regex = new RegExp(TASK_DRAFT_BLOCK_REGEX);

  while ((match = regex.exec(text)) !== null) {
    const draft = parseAiTaskDraft(match[1].trim());
    if (draft) results.push(draft);
  }

  return results;
}

export function stripTaskDraftBlocks(text: string): string {
  return text.replace(TASK_DRAFT_BLOCK_REGEX, "").trim();
}