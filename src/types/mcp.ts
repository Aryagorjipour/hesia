import { z } from "zod";

export const McpTransportSchema = z.enum(["stdio", "sse", "http"]);

export type McpTransport = z.infer<typeof McpTransportSchema>;

export const McpServerConfigSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(60),
  transport: McpTransportSchema.default("sse"),
  /** Command for stdio transport (e.g. `npx`) */
  command: z.string().optional(),
  args: z.array(z.string()).optional(),
  /** URL for sse/http transports */
  url: z.string().optional(),
  env: z.record(z.string(), z.string()).optional(),
  enabled: z.boolean().default(true),
  description: z.string().max(200).optional(),
});

export type McpServerConfig = z.infer<typeof McpServerConfigSchema>;

export const McpToolSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  inputSchema: z.record(z.string(), z.unknown()).optional(),
  serverId: z.string().optional(),
  serverName: z.string().optional(),
});

export type McpTool = z.infer<typeof McpToolSchema>;

export const McpToolCallResultSchema = z.object({
  ok: z.boolean(),
  content: z.array(
    z.object({
      type: z.enum(["text", "image", "resource"]),
      text: z.string().optional(),
    }),
  ),
  error: z.string().optional(),
});

export type McpToolCallResult = z.infer<typeof McpToolCallResultSchema>;

export const RelayHealthSchema = z.object({
  ok: z.boolean(),
  version: z.string().optional(),
  smtpConfigured: z.boolean().optional(),
  mcpBridgeReady: z.boolean().optional(),
});

export type RelayHealth = z.infer<typeof RelayHealthSchema>;