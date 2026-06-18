import { v4 as uuidv4 } from "uuid";
import type { AiFeatureRouting, AiProviderProfile } from "@/types/ai-provider";
import { AI_FEATURE_KEYS } from "@/types/ai-provider";
import type { AiConfig, AppSettings } from "@/types/settings";

export function profileFromLegacyConfig(
  config: AiConfig,
  label = "Default",
): AiProviderProfile {
  return {
    id: uuidv4(),
    label,
    providerPreset: config.providerPreset,
    baseUrl: config.baseUrl,
    encryptedApiKey: config.encryptedApiKey,
    model: config.model,
    temperature: config.temperature,
    streaming: config.streaming,
    maxContextWeeks: config.maxContextWeeks,
    customSystemPrompt: config.customSystemPrompt,
  };
}

export function defaultRoutingForProfile(profileId: string): AiFeatureRouting {
  return Object.fromEntries(
    AI_FEATURE_KEYS.map((key) => [key, profileId]),
  ) as AiFeatureRouting;
}

export function migrateSettingsAi(settings: AppSettings): AppSettings {
  if (settings.aiProfiles && settings.aiProfiles.length > 0) {
    return settings;
  }
  if (!settings.aiConfig) {
    return settings;
  }
  const profile = profileFromLegacyConfig(settings.aiConfig);
  return {
    ...settings,
    aiProfiles: [profile],
    aiFeatureRouting: defaultRoutingForProfile(profile.id),
    aiConfig: undefined,
  };
}