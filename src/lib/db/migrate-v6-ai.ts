import { v4 as uuidv4 } from "uuid";
import { AI_FEATURE_KEYS } from "@/types/ai-provider";
import type { AiFeatureRouting, AiProviderProfile } from "@/types/ai-provider";
import type { AiConfig, AppSettings } from "@/types/settings";

function profileFromLegacyConfig(config: AiConfig): AiProviderProfile {
  return {
    id: uuidv4(),
    label: "Default",
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

function defaultRoutingForProfile(profileId: string): AiFeatureRouting {
  return Object.fromEntries(
    AI_FEATURE_KEYS.map((key) => [key, profileId]),
  ) as AiFeatureRouting;
}

export function migrateSettingsAiV6(settings: AppSettings): AppSettings {
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