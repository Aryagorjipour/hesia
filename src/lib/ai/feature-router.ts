import type { AiFeatureKey, AiProviderProfile } from "@/types/ai-provider";
import type { AppSettings } from "@/types/settings";

export function getAiProfiles(settings: AppSettings | undefined): AiProviderProfile[] {
  return settings?.aiProfiles ?? [];
}

export function resolveProfileForFeature(
  settings: AppSettings | undefined,
  feature: AiFeatureKey,
): AiProviderProfile | undefined {
  const profiles = getAiProfiles(settings);
  if (profiles.length === 0) return undefined;
  const routing = settings?.aiFeatureRouting;
  const profileId = routing?.[feature] ?? profiles[0]?.id;
  return profiles.find((p) => p.id === profileId) ?? profiles[0];
}

export function isFeatureConfigured(
  settings: AppSettings | undefined,
  feature: AiFeatureKey,
): boolean {
  const profile = resolveProfileForFeature(settings, feature);
  return Boolean(profile?.baseUrl && profile?.model);
}

export function isAnyAiConfigured(settings: AppSettings | undefined): boolean {
  return getAiProfiles(settings).some((p) => p.baseUrl && p.model);
}