/**
 * Extension point for future bot and webhook integrations.
 * Telegram, Discord, Matrix bots are intentionally out of scope for M5/M6 —
 * this registry documents reserved slots so downstream modules can plug in
 * without schema churn.
 */

export const BOT_INTEGRATION_SLOTS = [
  "telegram",
  "discord",
  "matrix",
  "slack",
  "webhook",
] as const;

export type BotIntegrationSlot = (typeof BOT_INTEGRATION_SLOTS)[number];

export type IntegrationExtensionType = "bot" | "webhook" | "custom";

export interface IntegrationExtension {
  id: string;
  slot: BotIntegrationSlot | string;
  name: string;
  type: IntegrationExtensionType;
  enabled: boolean;
  /** Opaque config blob — validated by the extension module when implemented */
  config: Record<string, unknown>;
  description?: string;
}

/** Placeholder registry — populated when bot modules ship */
export const REGISTERED_INTEGRATION_EXTENSIONS: IntegrationExtension[] = [];

export function isBotSlot(slot: string): slot is BotIntegrationSlot {
  return (BOT_INTEGRATION_SLOTS as readonly string[]).includes(slot);
}