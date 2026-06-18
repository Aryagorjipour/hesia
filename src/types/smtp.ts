import { z } from "zod";

export const SmtpProviderPresetSchema = z.enum([
  "gmail",
  "outlook",
  "yahoo",
  "custom",
]);

export type SmtpProviderPreset = z.infer<typeof SmtpProviderPresetSchema>;

export const PublicSmtpConfigSchema = z.object({
  host: z.string(),
  port: z.number(),
  secure: z.boolean(),
  user: z.string(),
  from: z.string(),
  passConfigured: z.boolean(),
});

export type PublicSmtpConfig = z.infer<typeof PublicSmtpConfigSchema>;

export const SmtpConfigResponseSchema = z.object({
  ok: z.boolean(),
  configured: z.boolean(),
  config: PublicSmtpConfigSchema.nullable(),
});

export type SmtpConfigResponse = z.infer<typeof SmtpConfigResponseSchema>;

export interface SmtpFormValues {
  preset: SmtpProviderPreset;
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  fromName: string;
}