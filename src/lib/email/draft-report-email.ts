import { parseISO } from "date-fns";
import type { WeeklyReport } from "@/types/report";
import type { LocaleSettings } from "@/types/settings";
import { reportToMarkdown } from "@/lib/export/report-export";
import { formatWeekRangeDisplay } from "@/lib/calendar/jalali-display";

export interface DraftReportEmail {
  subject: string;
  text: string;
  html: string;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function draftReportEmail(
  report: WeeklyReport,
  locale: Pick<LocaleSettings, "calendar"> = { calendar: "gregorian" },
  workspaceName = "Hesia",
): DraftReportEmail {
  const weekStart = parseISO(report.localStats.weekStart);
  const weekEnd = parseISO(report.localStats.weekEnd);
  const weekLabel = formatWeekRangeDisplay(weekStart, weekEnd, locale);
  const markdown = reportToMarkdown(report);

  const subject = `${workspaceName} weekly reflection — ${weekLabel}`;
  const text = [
    `Weekly reflection for ${weekLabel}`,
    "",
    markdown,
    "",
    "— Sent from Hesia (local-first, privacy-first)",
  ].join("\n");

  const html = [
    `<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;line-height:1.5;color:#1a1a1a">`,
    `<h2>${escapeHtml(workspaceName)} weekly reflection</h2>`,
    `<p><em>${escapeHtml(weekLabel)}</em></p>`,
    `<pre style="white-space:pre-wrap;background:#f4f4f5;padding:16px;border-radius:8px">${escapeHtml(markdown)}</pre>`,
    `<p style="color:#666;font-size:12px">Sent from Hesia — local-first, privacy-first</p>`,
    `</body></html>`,
  ].join("");

  return { subject, text, html };
}

export function buildMailtoUrl(
  to: string,
  draft: DraftReportEmail,
): string {
  const params = new URLSearchParams();
  params.set("subject", draft.subject);
  params.set("body", draft.text);
  const encoded = params.toString().replace(/\+/g, "%20");
  return `mailto:${encodeURIComponent(to)}?${encoded}`;
}