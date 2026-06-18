import type { AiFeatureKey } from "@/types/ai-provider";
import type { AiConfig, AppSettings } from "@/types/settings";
import {
  isAnyAiConfigured,
  isFeatureConfigured,
} from "@/lib/ai/feature-router";

export function isAiConfigured(
  aiConfig: AiConfig | undefined,
): boolean {
  return !!aiConfig?.baseUrl && !!aiConfig?.model;
}

export function isAiConfiguredForFeature(
  settings: AppSettings | undefined,
  feature: AiFeatureKey,
): boolean {
  return isFeatureConfigured(settings, feature);
}

export function isSettingsAiConfigured(
  settings: AppSettings | undefined,
): boolean {
  return isAnyAiConfigured(settings);
}