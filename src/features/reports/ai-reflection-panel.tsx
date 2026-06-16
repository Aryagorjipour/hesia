"use client";

import { useState } from "react";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import {
  Download,
  FileJson,
  Loader2,
  RefreshCw,
  Settings,
  Sparkles,
  Trash2,
} from "lucide-react";
import type { WeekLocalStats } from "@/types/report";
import { MarkdownContent } from "@/features/chat/markdown-content";
import { useWeeklyReport } from "./use-weekly-report";
import {
  downloadReportJson,
  downloadReportMarkdown,
} from "@/lib/export/report-export";
import { formatWeekLabel } from "@/lib/utils/dates";
import { useWeekStartsOn } from "@/lib/hooks/use-week-starts-on";
import { useOnlineStatus } from "@/lib/hooks/use-online-status";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface AiReflectionPanelProps {
  weekStart: string;
  stats: WeekLocalStats;
}

function ReportNotesForm({
  reportId,
  initialNotes,
  onSave,
}: {
  reportId: string;
  initialNotes: string;
  onSave: (id: string, notes: string) => Promise<void>;
}) {
  const [notes, setNotes] = useState(initialNotes);
  const [savingNotes, setSavingNotes] = useState(false);

  async function handleSaveNotes() {
    setSavingNotes(true);
    try {
      await onSave(reportId, notes);
    } finally {
      setSavingNotes(false);
    }
  }

  return (
    <div className="mt-5 space-y-2 border-t border-border/40 pt-4">
      <Label htmlFor="report-notes">Your notes</Label>
      <Textarea
        id="report-notes"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={3}
        placeholder="Add your own reflection — included in exports"
      />
      <Button
        size="sm"
        variant="secondary"
        onClick={() => void handleSaveNotes()}
        disabled={savingNotes}
      >
        {savingNotes ? "Saving…" : "Save notes"}
      </Button>
    </div>
  );
}

export function AiReflectionPanel({ weekStart, stats }: AiReflectionPanelProps) {
  const {
    report,
    generating,
    error,
    aiConfigured,
    generate,
    saveNotes,
    remove,
  } = useWeeklyReport(weekStart, stats);

  const weekStartsOn = useWeekStartsOn();
  const isOnline = useOnlineStatus();
  const weekLabel = formatWeekLabel(parseISO(weekStart), weekStartsOn);
  const hasNarrative = !!report?.aiNarrative?.trim();

  async function handleDelete() {
    if (!report || report.id === "generating") return;
    if (!confirm("Delete this saved reflection?")) return;
    await remove(report.id);
  }

  if (!aiConfigured) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card/40 p-6 text-center">
        <Sparkles className="mx-auto mb-2 h-5 w-5 text-accent" />
        <p className="text-sm text-muted-foreground">
          Connect AI in Settings to generate weekly reflections from your local
          stats.
        </p>
        <Button variant="secondary" size="sm" className="mt-3 gap-1.5" asChild>
          <Link href="/settings/ai">
            <Settings className="h-3.5 w-3.5" />
            Configure AI
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card/50">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 px-4 py-3 sm:px-5">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-accent" />
          <div>
            <h2 className="text-sm font-medium text-foreground">
              AI reflection
            </h2>
            <p className="text-xs text-muted-foreground">{weekLabel}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant={hasNarrative ? "secondary" : "default"}
            className="gap-1.5"
            onClick={() => void generate()}
            disabled={generating || stats.totalTasks === 0 || !isOnline}
          >
            {generating ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : hasNarrative ? (
              <RefreshCw className="h-3.5 w-3.5" />
            ) : (
              <Sparkles className="h-3.5 w-3.5" />
            )}
            {generating
              ? "Generating…"
              : hasNarrative
                ? "Regenerate"
                : "Generate"}
          </Button>
          {report && report.id !== "generating" && hasNarrative && (
            <>
              <Button
                size="sm"
                variant="ghost"
                className="gap-1.5"
                onClick={() => downloadReportMarkdown(report)}
              >
                <Download className="h-3.5 w-3.5" />
                .md
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="gap-1.5"
                onClick={() => downloadReportJson(report)}
              >
                <FileJson className="h-3.5 w-3.5" />
                .json
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-muted-foreground hover:text-red-400"
                onClick={() => void handleDelete()}
                aria-label="Delete report"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="px-4 py-4 sm:px-5">
        {stats.totalTasks === 0 ? (
          <p className="text-sm text-muted-foreground">
            No tasks this week — add activity on your board first.
          </p>
        ) : !hasNarrative && !generating ? (
          <p className="text-sm text-muted-foreground">
            Your charts above are computed locally. Generate a warm, data-grounded
            narrative when you&apos;re ready to reflect.
          </p>
        ) : (
          <>
            {report?.generatedAt && report.id !== "generating" && (
              <p className="mb-3 text-[10px] text-muted-foreground/70">
                Saved {format(parseISO(report.generatedAt), "MMM d, h:mm a")}
                {report.providerSnapshot ? ` · ${report.providerSnapshot}` : ""}
              </p>
            )}
            <MarkdownContent content={report?.aiNarrative ?? ""} />
          </>
        )}

        {!isOnline && (
          <p className="mt-3 rounded-xl bg-amber-500/10 px-3 py-2 text-xs text-amber-200/90">
            Offline — connect to generate AI reflections.
          </p>
        )}

        {error && (
          <p className="mt-3 rounded-xl bg-red-500/10 px-3 py-2 text-xs text-red-400">
            {error}
          </p>
        )}

        {report && report.id !== "generating" && hasNarrative && (
          <ReportNotesForm
            key={report.id}
            reportId={report.id}
            initialNotes={report.userNotes ?? ""}
            onSave={saveNotes}
          />
        )}
      </div>
    </div>
  );
}