/**
 * Built-in MCP-style tools exposed by the Hesia relay.
 * These wrap relay HTTP capabilities (email, health) for external MCP clients.
 */

export interface HesaiToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export const HESIA_RELAY_TOOLS: HesaiToolDefinition[] = [
  {
    name: "hesia_send_email",
    description:
      "Send an email through the local Hesia relay SMTP transport. Requires relay SMTP config.",
    inputSchema: {
      type: "object",
      properties: {
        to: { type: "string", description: "Recipient email address" },
        subject: { type: "string" },
        text: { type: "string", description: "Plain-text body" },
        html: { type: "string", description: "Optional HTML body" },
      },
      required: ["to", "subject", "text"],
    },
  },
  {
    name: "hesia_relay_health",
    description: "Check whether the Hesia relay is running and SMTP is configured.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
];

export function listHesiaToolDefinitions(): HesaiToolDefinition[] {
  return HESIA_RELAY_TOOLS;
}

export function findHesiaTool(name: string): HesaiToolDefinition | undefined {
  return HESIA_RELAY_TOOLS.find((t) => t.name === name);
}