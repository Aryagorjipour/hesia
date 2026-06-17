import type { AiConfig } from "@/types/settings";

export function isAiConfigured(
  aiConfig: AiConfig | undefined,
): boolean {
  return !!aiConfig?.baseUrl && !!aiConfig?.model;
}