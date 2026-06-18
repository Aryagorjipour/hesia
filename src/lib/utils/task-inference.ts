import type { TaskStatus } from "@/types/task";

export interface QuickLogInference {
  status: TaskStatus;
  isPlanned: boolean;
  durationMinutes?: number;
  suggestedTags: string[];
  suggestedCategory?: string;
}

const PAST_TENSE_PATTERNS = [
  /\b(finished|completed|did|done|just|walked|ran|read|wrote|called|fixed|built|shipped)\b/i,
];

const PLANNED_PATTERNS = [
  /\b(plan|schedule|prepare|organize|set up|todo|to-do|need to|will|going to)\b/i,
];

const DURATION_PATTERN = /\b(\d+)\s*(min|mins|minutes|hr|hrs|hours)\b/i;

const TAG_HINTS: Record<string, RegExp> = {
  health: /\b(yoga|walk|gym|run|meditat|health|sleep|doctor)\b/i,
  movement: /\b(yoga|walk|run|bike|swim|exercise|stretch)\b/i,
  "deep-work": /\b(deep work|focus|code|feature|build|ship|debug)\b/i,
  learning: /\b(read|learn|course|study|book|tutorial)\b/i,
  admin: /\b(email|inbox|call|appointment|bill|errand|admin)\b/i,
  writing: /\b(write|blog|draft|content|journal)\b/i,
};

const CATEGORY_HINTS: Record<string, RegExp> = {
  Health: /\b(yoga|walk|gym|run|meditat|health|sleep)\b/i,
  "Deep Work": /\b(deep work|focus|code|feature|build|ship)\b/i,
  Learning: /\b(read|learn|course|study|book)\b/i,
  "Life Admin": /\b(email|inbox|call|appointment|bill|errand)\b/i,
};

/** First line of the log, trimmed for use as a board card title. */
export function buildTitleFromQuickLog(text: string): string {
  const trimmed = text.trim();
  const firstLine = trimmed.split(/\n/)[0]?.trim() ?? trimmed;
  if (firstLine.length <= 80) return firstLine;
  return `${firstLine.slice(0, 77)}…`;
}

export function inferFromQuickLog(text: string): QuickLogInference {
  const trimmed = text.trim();
  const isPastTense = PAST_TENSE_PATTERNS.some((p) => p.test(trimmed));
  const isPlannedIntent = PLANNED_PATTERNS.some((p) => p.test(trimmed));

  let status: TaskStatus = "inbox";
  if (isPastTense && !isPlannedIntent) {
    status = "done";
  } else if (isPlannedIntent) {
    status = "todo";
  }

  const isPlanned = isPlannedIntent && !isPastTense;

  let durationMinutes: number | undefined;
  const durationMatch = trimmed.match(DURATION_PATTERN);
  if (durationMatch) {
    const value = parseInt(durationMatch[1], 10);
    const unit = durationMatch[2].toLowerCase();
    durationMinutes = unit.startsWith("h") ? value * 60 : value;
  }

  const suggestedTags: string[] = [];
  for (const [tag, pattern] of Object.entries(TAG_HINTS)) {
    if (pattern.test(trimmed)) suggestedTags.push(tag);
  }

  let suggestedCategory: string | undefined;
  for (const [category, pattern] of Object.entries(CATEGORY_HINTS)) {
    if (pattern.test(trimmed)) {
      suggestedCategory = category;
      break;
    }
  }

  return {
    status,
    isPlanned,
    durationMinutes,
    suggestedTags,
    suggestedCategory,
  };
}