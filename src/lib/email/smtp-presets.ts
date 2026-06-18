import type { SmtpProviderPreset } from "@/types/smtp";

export interface SmtpPresetDefinition {
  id: SmtpProviderPreset;
  label: string;
  host: string;
  port: number;
  secure: boolean;
  helpUrl?: string;
  helpText: string;
}

export const SMTP_PRESETS: SmtpPresetDefinition[] = [
  {
    id: "gmail",
    label: "Gmail",
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    helpUrl: "https://support.google.com/accounts/answer/185833",
    helpText: "Use a Google App Password (not your normal Gmail password).",
  },
  {
    id: "outlook",
    label: "Outlook / Office 365",
    host: "smtp.office365.com",
    port: 587,
    secure: false,
    helpUrl: "https://support.microsoft.com/account-billing/using-app-passwords-with-apps-that-don-t-support-two-step-verification-5896ed9b-4263-e681-128a-a6f2979a7944",
    helpText: "Use your Microsoft account email and an app password if 2FA is on.",
  },
  {
    id: "yahoo",
    label: "Yahoo Mail",
    host: "smtp.mail.yahoo.com",
    port: 587,
    secure: false,
    helpUrl: "https://help.yahoo.com/kb/generate-manage-third-party-passwords-sln15241.html",
    helpText: "Generate an app password in Yahoo Account Security.",
  },
  {
    id: "custom",
    label: "Other SMTP",
    host: "",
    port: 587,
    secure: false,
    helpText: "Any SMTP server you can reach from this computer.",
  },
];

export function getSmtpPreset(id: SmtpProviderPreset): SmtpPresetDefinition {
  return SMTP_PRESETS.find((p) => p.id === id) ?? SMTP_PRESETS[3]!;
}

export function guessPresetFromHost(host: string): SmtpProviderPreset {
  const lower = host.toLowerCase();
  if (lower.includes("gmail")) return "gmail";
  if (lower.includes("office365") || lower.includes("outlook")) return "outlook";
  if (lower.includes("yahoo")) return "yahoo";
  return "custom";
}

export function buildFromAddress(name: string, email: string): string {
  const trimmedName = name.trim();
  const trimmedEmail = email.trim();
  if (!trimmedName) return trimmedEmail;
  return `${trimmedName} <${trimmedEmail}>`;
}

export function parseFromAddress(from: string): { name: string; email: string } {
  const match = from.match(/^(.+?)\s*<([^>]+)>$/);
  if (match) {
    return { name: match[1]!.trim(), email: match[2]!.trim() };
  }
  return { name: "", email: from.trim() };
}