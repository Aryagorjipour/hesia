import type { AiProviderProfile } from "@/types/ai-provider";
import { resolveApiKey } from "./client";

const PROBE_TIMEOUT_MS = 15_000;

export interface CapabilityProbeResult {
  supportsToolCalls: boolean;
  message: string;
}

export async function probeToolCallSupport(
  profile: AiProviderProfile,
  apiKeyOverride?: string,
): Promise<CapabilityProbeResult> {
  const apiKey = apiKeyOverride ?? (await resolveApiKey(profile));
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(profile.optionalHeaders ?? {}),
  };
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);

  try {
    const response = await fetch(
      `${profile.baseUrl.replace(/\/$/, "")}/chat/completions`,
      {
        method: "POST",
        headers,
        signal: controller.signal,
        body: JSON.stringify({
          model: profile.model,
          messages: [{ role: "user", content: "ping" }],
          tools: [
            {
              type: "function",
              function: {
                name: "hesia_probe",
                description: "Capability probe",
                parameters: { type: "object", properties: {} },
              },
            },
          ],
          tool_choice: "none",
          max_tokens: 1,
        }),
      },
    );

    if (response.status === 400) {
      const text = await response.text();
      if (/tools|tool_calls|function/i.test(text)) {
        return { supportsToolCalls: false, message: "Endpoint rejected tool-calls" };
      }
    }

    if (!response.ok) {
      return { supportsToolCalls: false, message: `Probe failed: HTTP ${response.status}` };
    }

    return { supportsToolCalls: true, message: "Tool-calls supported" };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Capability probe failed";
    return { supportsToolCalls: false, message };
  } finally {
    clearTimeout(timer);
  }
}