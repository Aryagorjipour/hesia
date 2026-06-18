import type { AiProviderProfile } from "@/types/ai-provider";
import { decryptApiKey } from "@/lib/crypto/key-vault";

export type AiEndpointConfig = AiProviderProfile;

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface StreamCompletionExtras {
  toolCalls: {
    id: string;
    name: string;
    arguments: string;
  }[];
}

export interface StreamCallbacks {
  onToken: (token: string) => void;
  onDone: (fullText: string, extras?: StreamCompletionExtras) => void;
  onError: (error: Error) => void;
}

export interface AiCallOptions {
  messages: ChatMessage[];
  jsonMode?: boolean;
}

export async function resolveApiKey(
  config: AiEndpointConfig,
): Promise<string | undefined> {
  if (!config.encryptedApiKey) return undefined;
  try {
    return await decryptApiKey(config.encryptedApiKey);
  } catch {
    return undefined;
  }
}

export async function streamChatCompletion(
  config: AiEndpointConfig,
  options: AiCallOptions,
  callbacks: StreamCallbacks,
  apiKeyOverride?: string,
): Promise<void> {
  const apiKey = apiKeyOverride ?? (await resolveApiKey(config));
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`;

  const body: Record<string, unknown> = {
    model: config.model,
    messages: options.messages,
    temperature: config.temperature,
    stream: config.streaming,
  };
  if (options.jsonMode) {
    body.response_format = { type: "json_object" };
  }

  let response: Response;
  try {
    response = await fetch(`${config.baseUrl.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
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

  if (!config.streaming || !response.body) {
    const json = await response.json();
    const content = json.choices?.[0]?.message?.content ?? "";
    callbacks.onToken(content);
    callbacks.onDone(content);
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let fullText = "";
  let buffer = "";

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
          const token = parsed.choices?.[0]?.delta?.content ?? "";
          if (token) {
            fullText += token;
            callbacks.onToken(token);
          }
        } catch {
          // skip malformed SSE chunks
        }
      }
    }
    callbacks.onDone(fullText);
  } catch (err) {
    callbacks.onError(err instanceof Error ? err : new Error("Stream interrupted"));
  }
}

export async function testConnection(
  config: AiEndpointConfig,
  apiKey?: string,
): Promise<{ ok: boolean; message: string; sample?: string }> {
  return new Promise((resolve) => {
    streamChatCompletion(
      config,
      {
        messages: [
          {
            role: "user",
            content: 'Reply with exactly: "Hesia connection OK"',
          },
        ],
      },
      {
        onToken: () => {},
        onDone: (full) => {
          resolve({
            ok: true,
            message: "Connection successful",
            sample: full.trim(),
          });
        },
        onError: (err) => {
          resolve({ ok: false, message: err.message });
        },
      },
      apiKey,
    );
  });
}