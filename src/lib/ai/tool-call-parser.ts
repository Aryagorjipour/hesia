import { parseToolCallToAction } from "./action-schema";
import type { HesiaAction } from "@/types/ai-actions";

export interface ToolCallStreamDelta {
  index: number;
  id?: string;
  name?: string;
  arguments?: string;
}

export interface AccumulatedToolCall {
  id: string;
  name: string;
  arguments: string;
}

interface PartialToolCall {
  id?: string;
  name?: string;
  arguments: string;
}

export class ToolCallAccumulator {
  private calls = new Map<number, PartialToolCall>();

  addDelta(delta: ToolCallStreamDelta): void {
    const index = delta.index;
    const existing = this.calls.get(index) ?? { arguments: "" };

    if (delta.id) existing.id = delta.id;
    if (delta.name) existing.name = delta.name;
    if (delta.arguments) existing.arguments += delta.arguments;

    this.calls.set(index, existing);
  }

  finalize(): AccumulatedToolCall[] {
    return [...this.calls.entries()]
      .sort(([a], [b]) => a - b)
      .map(([, call]) => ({
        id: call.id ?? "",
        name: call.name ?? "",
        arguments: call.arguments,
      }))
      .filter((call) => call.name.length > 0);
  }

  reset(): void {
    this.calls.clear();
  }
}

export function parseToolCallDeltasFromChoiceDelta(
  delta: Record<string, unknown>,
): ToolCallStreamDelta[] {
  const toolCalls = delta.tool_calls;
  if (!Array.isArray(toolCalls)) return [];

  const results: ToolCallStreamDelta[] = [];

  for (const item of toolCalls) {
    if (!item || typeof item !== "object") continue;
    const tc = item as Record<string, unknown>;
    const index = typeof tc.index === "number" ? tc.index : 0;
    const fn =
      tc.function && typeof tc.function === "object"
        ? (tc.function as Record<string, unknown>)
        : undefined;

    results.push({
      index,
      id: typeof tc.id === "string" ? tc.id : undefined,
      name: typeof fn?.name === "string" ? fn.name : undefined,
      arguments:
        typeof fn?.arguments === "string" ? fn.arguments : undefined,
    });
  }

  return results;
}

export function parseActionsFromToolCalls(
  toolCalls: AccumulatedToolCall[],
): HesiaAction[] {
  const actions: HesiaAction[] = [];

  for (const call of toolCalls) {
    const action = parseToolCallToAction(call.name, call.arguments);
    if (action) actions.push(action);
  }

  return actions;
}

export function extractToolCallsFromMessage(
  message: Record<string, unknown>,
): AccumulatedToolCall[] {
  const toolCalls = message.tool_calls;
  if (!Array.isArray(toolCalls)) return [];

  return toolCalls
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const tc = item as Record<string, unknown>;
      const fn =
        tc.function && typeof tc.function === "object"
          ? (tc.function as Record<string, unknown>)
          : undefined;
      const name = typeof fn?.name === "string" ? fn.name : "";
      const args = typeof fn?.arguments === "string" ? fn.arguments : "";
      const id = typeof tc.id === "string" ? tc.id : "";
      if (!name) return null;
      return { id, name, arguments: args };
    })
    .filter((call): call is AccumulatedToolCall => call !== null);
}