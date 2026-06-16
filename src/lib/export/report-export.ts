import { parseISO, format } from "date-fns";
import type { WeeklyReport } from "@/types/report";
import { formatWeekLabel } from "@/lib/utils/dates";
import { formatStatsSectionForPrompt } from "@/lib/stats/week-aggregator";

export function reportToMarkdown(report: WeeklyReport): string {
  const weekLabel =
    report.localStats.weekStart && report.localStats.weekEnd
      ? `${format(parseISO(report.localStats.weekStart), "MMM d")} – ${format(parseISO(report.localStats.weekEnd), "MMM d, yyyy")}`
      : formatWeekLabel(parseISO(report.weekStart));
  const generated = format(parseISO(report.generatedAt), "MMM d, yyyy h:mm a");

  const sections = [
    `# Weekly Reflection — ${weekLabel}`,
    "",
    `_Generated ${generated}${report.providerSnapshot ? ` · ${report.providerSnapshot}` : ""}_`,
    "",
    "## Stats snapshot",
    "",
    formatStatsSectionForPrompt(report.localStats),
    "",
    "## AI reflection",
    "",
    report.aiNarrative ?? "_No narrative generated_",
  ];

  if (report.userNotes?.trim()) {
    sections.push("", "## Your notes", "", report.userNotes.trim());
  }

  return sections.join("\n");
}

export function reportToJson(report: WeeklyReport): string {
  return JSON.stringify(report, null, 2);
}

export function downloadFile(
  filename: string,
  content: string,
  mimeType: string,
): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function downloadReportMarkdown(report: WeeklyReport): void {
  const label = format(parseISO(report.weekStart), "yyyy-MM-dd");
  downloadFile(
    `hesia-report-${label}.md`,
    reportToMarkdown(report),
    "text/markdown;charset=utf-8",
  );
}

export function downloadReportJson(report: WeeklyReport): void {
  const label = format(parseISO(report.weekStart), "yyyy-MM-dd");
  downloadFile(
    `hesia-report-${label}.json`,
    reportToJson(report),
    "application/json;charset=utf-8",
  );
}