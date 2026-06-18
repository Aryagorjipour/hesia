import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";

export interface SmtpConfig {
  host: string;
  port: number;
  secure?: boolean;
  user: string;
  pass: string;
  from: string;
}

let transporter: Transporter | null = null;
let activeConfig: SmtpConfig | null = null;

export function isSmtpConfigured(config: SmtpConfig | null | undefined): boolean {
  return Boolean(config?.host && config.user && config.from);
}

export function getSmtpTransporter(config: SmtpConfig): Transporter {
  if (
    transporter &&
    activeConfig &&
    activeConfig.host === config.host &&
    activeConfig.user === config.user
  ) {
    return transporter;
  }

  transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure ?? config.port === 465,
    auth: {
      user: config.user,
      pass: config.pass,
    },
  });
  activeConfig = config;
  return transporter;
}

export interface SendMailInput {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export async function sendMail(
  config: SmtpConfig,
  input: SendMailInput,
): Promise<{ messageId: string }> {
  const transport = getSmtpTransporter(config);
  const info = await transport.sendMail({
    from: config.from,
    to: input.to,
    subject: input.subject,
    text: input.text,
    html: input.html,
  });
  return { messageId: info.messageId };
}