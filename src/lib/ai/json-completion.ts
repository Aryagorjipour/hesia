import { streamFeatureCompletion } from "@/lib/ai/ai-service";
import type { ChatMessage } from "@/lib/ai/client";
import type { AiFeatureKey } from "@/types/ai-provider";
import type { AppSettings } from "@/types/settings";

export async function fetchJsonCompletion(
  settings: AppSettings | undefined,
  feature: AiFeatureKey,
  messages: ChatMessage[],
): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    void streamFeatureCompletion(
      { settings, feature },
      { messages, jsonMode: true },
      {
        onToken: () => {},
        onDone: resolve,
        onError: reject,
      },
    );
  });
}