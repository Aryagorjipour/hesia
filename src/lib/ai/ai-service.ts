import type { AiFeatureKey, AiProviderProfile } from "@/types/ai-provider";
import type { AppSettings } from "@/types/settings";
import {
  testConnection,
  resolveApiKey,
  type ChatMessage,
  type StreamCallbacks,
} from "./client";
import { resolveProfileForFeature } from "./feature-router";
import {
  extractToolCallsFromMessage,
  parseToolCallDeltasFromChoiceDelta,
  ToolCallAccumulator,
} from "./tool-call-parser";

export interface AiCallContext {
  settings: AppSettings | undefined;
  feature: AiFeatureKey;
}

export interface AiToolDefinition {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export interface AiCompletionOptions {
  messages: ChatMessage[];
  jsonMode?: boolean;
  tools?: AiToolDefinition[];
  toolChoice?: "auto" | "none" | { type: "function"; function: { name: string } };
  signal?: AbortSignal;
  timeoutMs?: number;
}

const DEFAULT_TIMEOUT_MS = 120_000;

export function resolveFeatureProfile(
  ctx: AiCallContext,
): AiProviderProfile | undefined {
  return resolveProfileForFeature(ctx.settings, ctx.feature);
}

export async function streamFeatureCompletion(
  ctx: AiCallContext,
  options: AiCompletionOptions,
  callbacks: StreamCallbacks,
  apiKeyOverride?: string,
): Promise<void> {
  const profile = resolveFeatureProfile(ctx);
  if (!profile) {
    callbacks.onError(new Error("AI not configured for this feature"));
    return;
  }

  const controller = new AbortController();
  const timeout = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const timer = setTimeout(() => controller.abort(), timeout);
  if (options.signal) {
    options.signal.addEventListener("abort", () => controller.abort(), { once: true });
  }

  try {
    await streamWithProfile(profile, options, callbacks, apiKeyOverride, controller.signal);
  } catch (err) {
    callbacks.onError(err instanceof Error ? err : new Error("AI request failed"));
  } finally {
    clearTimeout(timer);
  }
}

async function streamWithProfile(
  profile: AiProviderProfile,
  options: AiCompletionOptions,
  callbacks: StreamCallbacks,
  apiKeyOverride: string | undefined,
  signal: AbortSignal,
): Promise<void> {
  const apiKey = apiKeyOverride ?? (await resolveApiKey(profile));
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(profile.optionalHeaders ?? {}),
  };
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`;

  const body: Record<string, unknown> = {
    model: profile.model,
    messages: options.messages,
    temperature: profile.temperature,
    stream: profile.streaming,
  };
  if (options.jsonMode) body.response_format = { type: "json_object" };
  if (options.tools?.length) {
    body.tools = options.tools;
    if (options.toolChoice) body.tool_choice = options.toolChoice;
  }

  let response: Response;
  try {
    response = await fetch(`${profile.baseUrl.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal,
    });
  } catch (err) {
    callbacks.onError(
      err instanceof Error ? err : new Error("Network error — check base URL and CORS"),
    );
    return;
  }

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    callbacks.onError(new Error(`API ${response.status}: ${text.slice(0, 200)}`));
    return;
  }

  if (!profile.streaming || !response.body) {
    const json = await response.json();
    const message = json.choices?.[0]?.message ?? {};
    const content =
      typeof message.content === "string" ? message.content : "";
    const toolCalls = extractToolCallsFromMessage(
      message as Record<string, unknown>,
    );
    callbacks.onToken(content);
    callbacks.onDone(content, { toolCalls });
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let fullText = "";
  let buffer = "";
  const toolCallAccumulator = new ToolCallAccumulator();

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data: ")) continue;
        const data = trimmed.slice(6);
        if (data === "[DONE]") continue;
        try {
          const parsed = JSON.parse(data);
          const delta = parsed.choices?.[0]?.delta;
          if (!delta || typeof delta !== "object") continue;

          const token =
            typeof delta.content === "string" ? delta.content : "";
          if (token) {
            fullText += token;
            callbacks.onToken(token);
          }

          for (const toolDelta of parseToolCallDeltasFromChoiceDelta(
            delta as Record<string, unknown>,
          )) {
            toolCallAccumulator.addDelta(toolDelta);
          }
        } catch {
          // skip malformed SSE
        }
      }
    }
    callbacks.onDone(fullText, {
      toolCalls: toolCallAccumulator.finalize(),
    });
  } catch (err) {
    callbacks.onError(err instanceof Error ? err : new Error("Stream interrupted"));
  }
}

export async function testFeatureConnection(
  ctx: AiCallContext,
  apiKey?: string,
): Promise<{ ok: boolean; message: string; sample?: string }> {
  const profile = resolveFeatureProfile(ctx);
  if (!profile) return { ok: false, message: "No profile configured for this feature" };
  return testConnection(profile, apiKey);
}

export function profileSupportsToolCalls(profile: AiProviderProfile): boolean {
  return profile.capabilities?.supportsToolCalls === true;
}