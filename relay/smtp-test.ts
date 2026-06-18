import nodemailer from "nodemailer";
import type { SmtpConfig } from "./smtp";

export async function verifySmtpConnection(
  config: SmtpConfig,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const transport = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure ?? config.port === 465,
    auth: {
      user: config.user,
      pass: config.pass,
    },
  });

  try {
    await transport.verify();
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "SMTP verification failed",
    };
  } finally {
    transport.close();
  }
}