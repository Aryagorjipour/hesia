import { parseHesiaActionJson } from "./action-schema";
import type { HesiaAction } from "@/types/ai-actions";

const HESIA_ACTION_BLOCK_REGEX =
  /\[HESIA_ACTION\]\s*([\s\S]+?)\s*\[\/HESIA_ACTION\]/gi;

export function parseHesiaActionBlocks(text: string): HesiaAction[] {
  const results: HesiaAction[] = [];
  let match: RegExpExecArray | null;
  const regex = new RegExp(HESIA_ACTION_BLOCK_REGEX);

  while ((match = regex.exec(text)) !== null) {
    const action = parseHesiaActionJson(match[1].trim());
    if (action) results.push(action);
  }

  return results;
}

export function stripHesiaActionBlocks(text: string): string {
  return text.replace(HESIA_ACTION_BLOCK_REGEX, "").trim();
}

export function resolveActionsFromContent(
  content: string,
  metadataActions?: HesiaAction[],
): HesiaAction[] {
  const fromMetadata = metadataActions ?? [];
  const fromBlocks = parseHesiaActionBlocks(content);

  if (fromMetadata.length > 0) {
    return fromMetadata;
  }

  return fromBlocks;
}