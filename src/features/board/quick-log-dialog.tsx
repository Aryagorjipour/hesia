"use client";

import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { format, parseISO } from "date-fns";
import { useRouter } from "next/navigation";
import { Bot, Sparkles } from "lucide-react";
import { useUIStore } from "@/stores/ui-store";
import { db } from "@/lib/db/schema";
import {
  createTask,
  ensureTagExists,
  ensureCategoryExists,
} from "@/lib/db/mutations/tasks";
import { generateTaskFromQuickLog } from "@/lib/ai/quick-log-task";
import type { AiTaskDraft } from "@/lib/ai/structured-output";
import { isAiConfiguredForFeature } from "@/lib/ai/is-ai-configured";
import {
  buildTitleFromQuickLog,
  inferFromQuickLog,
} from "@/lib/utils/task-inference";
import { toast } from "@/lib/toast";
import { toISO } from "@/lib/utils/dates";
import type { BoardPermissions } from "@/lib/utils/board-dates";
import { formatBoardDayLabel } from "@/lib/utils/board-dates";
import type { TaskStatus } from "@/types/task";
import { COLUMN_LABELS, DEFAULT_COLUMNS } from "@/types/task";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

interface QuickLogDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialStatus?: TaskStatus;
  boardDate: string;
  permissions: BoardPermissions;
}

async function persistQuickLogDraft(
  draft: AiTaskDraft,
  boardDate: string,
): Promise<void> {
  for (const tag of draft.tags) await ensureTagExists(tag);
  if (draft.category) await ensureCategoryExists(draft.category);

  await createTask({
    title: draft.title,
    description: draft.description,
    notes: draft.notes,
    status: draft.status,
    isPlanned: draft.isPlanned,
    tags: draft.tags,
    category: draft.category,
    durationMinutes: draft.durationMinutes,
    completedAt: draft.status === "done" ? toISO(new Date()) : undefined,
    boardDate: draft.status === "inbox" ? undefined : boardDate,
  });
}

function formatCreatedSummary(draft: AiTaskDraft): string {
  const parts = [
    COLUMN_LABELS[draft.status],
    draft.isPlanned ? "planned" : "flow win",
  ];
  if (draft.durationMinutes != null) {
    parts.push(`${draft.durationMinutes} min`);
  }
  return parts.join(" · ");
}

function QuickLogForm({
  initialStatus,
  boardDate,
  permissions,
  onClose,
}: {
  initialStatus: TaskStatus;
  boardDate: string;
  permissions: BoardPermissions;
  onClose: () => void;
}) {
  const router = useRouter();
  const setPendingChatDraft = useUIStore((s) => s.setPendingChatDraft);

  const tags = useLiveQuery(() => db.tags.toArray()) ?? [];
  const categories = useLiveQuery(() => db.categories.toArray()) ?? [];
  const settings = useLiveQuery(() => db.settings.get("default"));
  const aiConfigured = isAiConfiguredForFeature(settings, "quick-log");

  const allowedStatuses = useMemo(
    () => DEFAULT_COLUMNS.filter((s) => permissions.canAdd(s)),
    [permissions],
  );

  const defaultStatus = allowedStatuses.includes(initialStatus)
    ? initialStatus
    : allowedStatuses[0] ?? "todo";

  const [prompt, setPrompt] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function clampStatus(next: TaskStatus): TaskStatus {
    return allowedStatuses.includes(next) ? next : defaultStatus;
  }

  function buildLocalDraft(text: string): AiTaskDraft {
    const inference = inferFromQuickLog(text);
    const knownTags = inference.suggestedTags.filter((name) =>
      tags.some((t) => t.name === name),
    );
    const category =
      inference.suggestedCategory &&
      categories.some((c) => c.name === inference.suggestedCategory)
        ? inference.suggestedCategory
        : undefined;

    return {
      title: buildTitleFromQuickLog(text),
      notes: text,
      status: clampStatus(inference.status),
      isPlanned: inference.isPlanned,
      tags: knownTags,
      category,
      durationMinutes: inference.durationMinutes,
    };
  }

  async function extractDraft(text: string): Promise<AiTaskDraft> {
    if (aiConfigured) {
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        throw new Error("AI needs an internet connection");
      }
      return generateTaskFromQuickLog(text, settings, {
        boardDate,
        allowedStatuses,
        tagNames: tags.map((t) => t.name),
        categoryNames: categories.map((c) => c.name),
      });
    }
    return buildLocalDraft(text);
  }

  async function handleLogIt() {
    const text = prompt.trim();
    if (!text) return;

    setSubmitting(true);
    try {
      const draft = await extractDraft(text);
      await persistQuickLogDraft(draft, boardDate);
      toast.success({
        title: "Task created",
        description: `"${draft.title}" — ${formatCreatedSummary(draft)}`,
      });
      onClose();
    } catch (err) {
      toast.error({
        title: aiConfigured ? "AI could not log task" : "Could not log task",
        description:
          err instanceof Error ? err.message : "Something went wrong",
      });
    } finally {
      setSubmitting(false);
    }
  }

  function askInChat() {
    const text = prompt.trim();
    if (!text) return;
    setPendingChatDraft(
      `I want to log this on my board: "${text}". Ask one short follow-up if needed, then draft a [TASK DRAFT].`,
    );
    onClose();
    router.push("/chat");
  }

  const promptHelp = aiConfigured
    ? "One prompt — AI extracts title, column, planned status, duration, tags, and category, then creates the task."
    : "One prompt — we infer column, planned status, duration, and tags from your words.";

  const promptPlaceholder = aiConfigured
    ? 'e.g. "Just finished a planned 25min yoga session" or "Need to spend 2 hours on Q3 content calendar tomorrow"'
    : 'e.g. "Just finished 25min yoga" or "Plan Q3 content calendar"';

  return (
    <div className="space-y-4">
      <div className="space-y-3 rounded-2xl border border-accent/25 bg-accent/5 p-4">
        <div className="flex items-start gap-2">
          {aiConfigured && (
            <Bot className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
          )}
          <div className="min-w-0 space-y-1">
            <Label htmlFor="quick-log-prompt" className="text-foreground">
              What happened?
            </Label>
            <p className="text-xs leading-relaxed text-muted-foreground">
              {promptHelp}
            </p>
          </div>
        </div>
        <Textarea
          id="quick-log-prompt"
          placeholder={promptPlaceholder}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={4}
          autoFocus
          disabled={submitting}
        />
      </div>

      <div className="flex gap-3">
        <Button variant="ghost" className="flex-1" onClick={onClose}>
          Cancel
        </Button>
        <Button
          className="flex-1"
          onClick={() => void handleLogIt()}
          disabled={!prompt.trim() || submitting}
        >
          {aiConfigured && <Sparkles className="h-4 w-4" />}
          {submitting ? "Logging…" : "Log it"}
        </Button>
      </div>

      {aiConfigured && (
        <div className="flex justify-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={askInChat}
            disabled={!prompt.trim() || submitting}
          >
            Ask in Companion instead
          </Button>
        </div>
      )}
    </div>
  );
}

function dialogDescription(
  status: TaskStatus,
  boardDate: string,
  permissions: BoardPermissions,
): string {
  const day = formatBoardDayLabel(boardDate);
  if (permissions.mode === "future") {
    return `Planning ${day} — only To Do items can be added ahead.`;
  }
  if (permissions.mode === "today") {
    return `Adding to ${COLUMN_LABELS[status]} on today — inbox is shared across all days.`;
  }
  return `Viewing ${day} — adding is disabled for this day.`;
}

export function QuickLogDialog({
  open,
  onOpenChange,
  initialStatus = "inbox",
  boardDate,
  permissions,
}: QuickLogDialogProps) {
  const formKey = `${initialStatus}-${boardDate}-${permissions.mode}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Quick log</DialogTitle>
          <DialogDescription>
            {dialogDescription(initialStatus, boardDate, permissions)}
            {permissions.mode === "future" && (
              <span className="mt-1 block text-muted-foreground">
                {format(parseISO(boardDate), "EEEE, MMM d")}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        {open && permissions.canAdd(initialStatus) && (
          <QuickLogForm
            key={formKey}
            initialStatus={initialStatus}
            boardDate={boardDate}
            permissions={permissions}
            onClose={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}