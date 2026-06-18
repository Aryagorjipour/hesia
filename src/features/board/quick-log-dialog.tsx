"use client";

import { useCallback, useMemo, useState } from "react";
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
import { suggestTags } from "@/lib/ai/suggest-tags";
import { suggestCategory } from "@/lib/ai/suggest-category";
import { estimateTime } from "@/lib/ai/estimate-time";
import { suggestPlanned } from "@/lib/ai/suggest-planned";
import { isAiConfiguredForFeature } from "@/lib/ai/is-ai-configured";
import {
  AiSuggestTrigger,
  AiSuggestionFeedback,
} from "./ai-suggestions-panel";
import { useAiSuggestion } from "./use-ai-suggestion";
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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { TagChip } from "@/components/ui/tag-chip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface QuickLogDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialStatus?: TaskStatus;
  boardDate: string;
  permissions: BoardPermissions;
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
  const tagAiConfigured = isAiConfiguredForFeature(settings, "tagging");
  const categoryAiConfigured = isAiConfiguredForFeature(settings, "categorization");
  const timeAiConfigured = isAiConfiguredForFeature(settings, "time-estimate");
  const plannedAiConfigured = isAiConfiguredForFeature(settings, "planned-suggest");
  const anyFieldAiConfigured =
    tagAiConfigured ||
    categoryAiConfigured ||
    timeAiConfigured ||
    plannedAiConfigured;

  const allowedStatuses = useMemo(
    () => DEFAULT_COLUMNS.filter((s) => permissions.canAdd(s)),
    [permissions],
  );

  const defaultStatus = allowedStatuses.includes(initialStatus)
    ? initialStatus
    : allowedStatuses[0] ?? "todo";

  const [aiPrompt, setAiPrompt] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<TaskStatus>(defaultStatus);
  const [isPlanned, setIsPlanned] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [category, setCategory] = useState<string>("");
  const [duration, setDuration] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiFilled, setAiFilled] = useState(false);

  function clampStatus(next: TaskStatus): TaskStatus {
    return allowedStatuses.includes(next) ? next : defaultStatus;
  }

  function applyDraftToForm(draft: {
    title: string;
    description?: string;
    notes?: string;
    status: TaskStatus;
    isPlanned: boolean;
    tags: string[];
    category?: string;
    durationMinutes?: number;
  }) {
    setTitle(draft.title);
    setDescription(draft.description ?? "");
    setNotes(draft.notes ?? "");
    setStatus(clampStatus(draft.status));
    setIsPlanned(draft.isPlanned);
    setSelectedTags(draft.tags);
    setCategory(draft.category ?? "");
    setDuration(
      draft.durationMinutes ? String(draft.durationMinutes) : "",
    );
    setAiFilled(true);
  }

  async function createWithAi() {
    const prompt = aiPrompt.trim();
    if (!prompt || !aiConfigured) return;

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      toast.warning({
        title: "You're offline",
        description: "AI needs an internet connection.",
      });
      return;
    }

    setAiGenerating(true);
    try {
      const draft = await generateTaskFromQuickLog(prompt, settings, {
        boardDate,
        allowedStatuses,
        tagNames: tags.map((t) => t.name),
        categoryNames: categories.map((c) => c.name),
      });

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

      toast.success({
        title: "Task created",
        description: `"${draft.title}" added via AI.`,
      });
      onClose();
    } catch (err) {
      toast.error({
        title: "AI could not create task",
        description:
          err instanceof Error ? err.message : "Something went wrong",
      });
    } finally {
      setAiGenerating(false);
    }
  }

  async function fillDetailsWithAi() {
    const prompt = aiPrompt.trim();
    if (!prompt || !aiConfigured) return;

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      toast.warning({
        title: "You're offline",
        description: "AI needs an internet connection.",
      });
      return;
    }

    setAiGenerating(true);
    try {
      const draft = await generateTaskFromQuickLog(prompt, settings, {
        boardDate,
        allowedStatuses,
        tagNames: tags.map((t) => t.name),
        categoryNames: categories.map((c) => c.name),
      });
      applyDraftToForm(draft);
      toast.success({
        title: "Fields filled",
        description: "Review the task details below, then add to board.",
      });
    } catch (err) {
      toast.error({
        title: "AI could not fill fields",
        description:
          err instanceof Error ? err.message : "Something went wrong",
      });
    } finally {
      setAiGenerating(false);
    }
  }

  function askInChat() {
    const draft = aiPrompt.trim();
    if (!draft) return;
    setPendingChatDraft(
      `I want to log this on my board: "${draft}". Ask one short follow-up if needed, then draft a [TASK DRAFT].`,
    );
    onClose();
    router.push("/chat");
  }

  function toggleTag(name: string) {
    setSelectedTags((prev) =>
      prev.includes(name) ? prev.filter((t) => t !== name) : [...prev, name],
    );
  }

  const suggestionSource = useCallback(() => {
    const sourceText = aiPrompt.trim() || title.trim();
    return {
      title: sourceText,
      description: description.trim() || undefined,
      notes: notes.trim() || undefined,
      status: COLUMN_LABELS[status],
      isPlanned,
      tags: selectedTags,
      category: category || undefined,
      durationMinutes: duration ? parseInt(duration, 10) : undefined,
    };
  }, [
    aiPrompt,
    title,
    description,
    notes,
    status,
    isPlanned,
    selectedTags,
    category,
    duration,
  ]);

  const hasSuggestionSource = !!(aiPrompt.trim() || title.trim());

  const tagSuggestion = useAiSuggestion({
    aiConfigured: tagAiConfigured,
    fetchSuggestion: () =>
      suggestTags(settings, {
        ...suggestionSource(),
        currentTags: selectedTags,
        availableTags: tags.map((t) => t.name),
      }),
    onAccept: (result) => {
      setSelectedTags((prev) => [...new Set([...prev, ...result.tags])]);
    },
  });

  const categorySuggestion = useAiSuggestion({
    aiConfigured: categoryAiConfigured,
    fetchSuggestion: () =>
      suggestCategory(settings, {
        ...suggestionSource(),
        currentCategory: category || undefined,
        availableCategories: categories.map((c) => c.name),
      }),
    onAccept: (result) => {
      if (result.category) setCategory(result.category);
    },
  });

  const timeSuggestion = useAiSuggestion({
    aiConfigured: timeAiConfigured,
    fetchSuggestion: () =>
      estimateTime(settings, {
        ...suggestionSource(),
        currentDurationMinutes: duration ? parseInt(duration, 10) : undefined,
      }),
    onAccept: (result) => {
      setDuration(String(result.durationMinutes));
    },
  });

  const plannedSuggestion = useAiSuggestion({
    aiConfigured: plannedAiConfigured,
    fetchSuggestion: () =>
      suggestPlanned(settings, {
        ...suggestionSource(),
        currentIsPlanned: isPlanned,
      }),
    onAccept: (result) => {
      setIsPlanned(result.isPlanned);
    },
  });

  async function handleSave() {
    const finalTitle = title.trim();
    if (!finalTitle || !permissions.canAdd(status)) return;

    setSaving(true);
    try {
      for (const tag of selectedTags) await ensureTagExists(tag);
      if (category) await ensureCategoryExists(category);

      await createTask({
        title: finalTitle,
        description: description.trim() || undefined,
        notes: notes.trim() || undefined,
        status,
        isPlanned,
        tags: selectedTags,
        category: category || undefined,
        durationMinutes: duration ? parseInt(duration, 10) : undefined,
        completedAt: status === "done" ? toISO(new Date()) : undefined,
        boardDate: status === "inbox" ? undefined : boardDate,
      });

      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      {aiConfigured && (
        <div className="space-y-3 rounded-2xl border border-accent/25 bg-accent/5 p-4">
          <div className="flex items-start gap-2">
            <Bot className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
            <div className="min-w-0 space-y-1">
              <Label htmlFor="quick-ai-prompt" className="text-foreground">
                Tell AI what happened
              </Label>
              <p className="text-xs leading-relaxed text-muted-foreground">
                Describe in plain language. AI picks the{" "}
                <span className="text-foreground/80">title</span>,{" "}
                <span className="text-foreground/80">description</span>,{" "}
                <span className="text-foreground/80">notes</span>, column,
                tags, and category — then creates the task.
              </p>
            </div>
          </div>
          <Textarea
            id="quick-ai-prompt"
            placeholder='e.g. "Just finished 25min yoga" or "Plan Q3 content calendar"'
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            rows={3}
            autoFocus
            disabled={aiGenerating}
          />
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              onClick={() => void createWithAi()}
              disabled={!aiPrompt.trim() || aiGenerating}
            >
              <Sparkles className="h-4 w-4" />
              {aiGenerating ? "Creating…" : "Create with AI"}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => void fillDetailsWithAi()}
              disabled={!aiPrompt.trim() || aiGenerating}
            >
              Fill fields to review
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={askInChat}
              disabled={!aiPrompt.trim() || aiGenerating}
            >
              Ask in Companion
            </Button>
          </div>
        </div>
      )}

      {anyFieldAiConfigured && hasSuggestionSource && (
        <div className="space-y-2 rounded-2xl border border-border/60 bg-card/30 p-3">
          <p className="text-xs text-muted-foreground">
            Optional AI suggestions from your text — review before accepting.
          </p>
          <div className="flex flex-wrap gap-2">
            {tagAiConfigured && tags.length > 0 && (
              <AiSuggestTrigger
                label="Tags"
                aiConfigured
                loading={tagSuggestion.state === "loading"}
                disabled={!tagSuggestion.isOnline}
                onSuggest={() => void tagSuggestion.suggest()}
              />
            )}
            {categoryAiConfigured && categories.length > 0 && (
              <AiSuggestTrigger
                label="Category"
                aiConfigured
                loading={categorySuggestion.state === "loading"}
                disabled={!categorySuggestion.isOnline}
                onSuggest={() => void categorySuggestion.suggest()}
              />
            )}
            {timeAiConfigured && (
              <AiSuggestTrigger
                label="Time"
                aiConfigured
                loading={timeSuggestion.state === "loading"}
                disabled={!timeSuggestion.isOnline}
                onSuggest={() => void timeSuggestion.suggest()}
              />
            )}
            {plannedAiConfigured && (
              <AiSuggestTrigger
                label="Planned"
                aiConfigured
                loading={plannedSuggestion.state === "loading"}
                disabled={!plannedSuggestion.isOnline}
                onSuggest={() => void plannedSuggestion.suggest()}
              />
            )}
          </div>
          <AiSuggestionFeedback
            featureName="Tag suggestions"
            state={tagSuggestion.state}
            error={tagSuggestion.error}
            isOnline={tagSuggestion.isOnline}
            onAccept={tagSuggestion.accept}
            onReject={tagSuggestion.reject}
            preview={
              tagSuggestion.suggestion ? (
                <div className="space-y-2">
                  {tagSuggestion.suggestion.tags.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {tagSuggestion.suggestion.tags.map((name) => {
                        const tag = tags.find((t) => t.name === name);
                        return (
                          <TagChip
                            key={name}
                            name={name}
                            colorHex={tag?.colorHex}
                            selected
                          />
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No tags suggested</p>
                  )}
                  {tagSuggestion.suggestion.reasoning && (
                    <p className="text-xs text-muted-foreground">
                      {tagSuggestion.suggestion.reasoning}
                    </p>
                  )}
                </div>
              ) : null
            }
          />
          <AiSuggestionFeedback
            featureName="Task categorization"
            state={categorySuggestion.state}
            error={categorySuggestion.error}
            isOnline={categorySuggestion.isOnline}
            onAccept={categorySuggestion.accept}
            onReject={categorySuggestion.reject}
            preview={
              categorySuggestion.suggestion ? (
                <div className="space-y-1">
                  <p className="font-medium text-foreground">
                    {categorySuggestion.suggestion.category ?? "None"}
                  </p>
                  {categorySuggestion.suggestion.reasoning && (
                    <p className="text-xs text-muted-foreground">
                      {categorySuggestion.suggestion.reasoning}
                    </p>
                  )}
                </div>
              ) : null
            }
          />
          <AiSuggestionFeedback
            featureName="Time estimates"
            state={timeSuggestion.state}
            error={timeSuggestion.error}
            isOnline={timeSuggestion.isOnline}
            onAccept={timeSuggestion.accept}
            onReject={timeSuggestion.reject}
            preview={
              timeSuggestion.suggestion ? (
                <div className="space-y-1">
                  <p className="font-medium text-foreground">
                    {timeSuggestion.suggestion.durationMinutes} minutes
                  </p>
                  {timeSuggestion.suggestion.reasoning && (
                    <p className="text-xs text-muted-foreground">
                      {timeSuggestion.suggestion.reasoning}
                    </p>
                  )}
                </div>
              ) : null
            }
          />
          <AiSuggestionFeedback
            featureName="Planned task suggestions"
            state={plannedSuggestion.state}
            error={plannedSuggestion.error}
            isOnline={plannedSuggestion.isOnline}
            onAccept={plannedSuggestion.accept}
            onReject={plannedSuggestion.reject}
            preview={
              plannedSuggestion.suggestion ? (
                <div className="space-y-1">
                  <p className="font-medium text-foreground">
                    {plannedSuggestion.suggestion.isPlanned
                      ? "Planned work"
                      : "Flow win (unplanned)"}
                  </p>
                  {plannedSuggestion.suggestion.reasoning && (
                    <p className="text-xs text-muted-foreground">
                      {plannedSuggestion.suggestion.reasoning}
                    </p>
                  )}
                </div>
              ) : null
            }
          />
        </div>
      )}

      <div className="space-y-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {aiConfigured ? "Or edit task details" : "Task details"}
          </p>
          {aiConfigured && aiFilled && (
            <p className="mt-1 text-xs text-muted-foreground">
              AI filled these — adjust anything before adding manually.
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Short name on the board card"
            autoFocus={!aiConfigured}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Input
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional one-line summary"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="notes">Notes</Label>
          <Textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional extra context or detail"
            rows={2}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Column</Label>
          <Select
            value={status}
            onValueChange={(v) => setStatus(clampStatus(v as TaskStatus))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {allowedStatuses.map((s) => (
                <SelectItem key={s} value={s}>
                  {COLUMN_LABELS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Duration (min)</Label>
          <Input
            type="number"
            min={1}
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            placeholder="Optional"
          />
        </div>
      </div>

      <div className="flex items-center justify-between rounded-2xl bg-muted/30 px-4 py-3">
        <div>
          <Label>Planned work</Label>
          <p className="text-xs text-muted-foreground">
            Off = flow win (ad-hoc)
          </p>
        </div>
        <Switch checked={isPlanned} onCheckedChange={setIsPlanned} />
      </div>

      <div className="space-y-2">
        <Label>Category</Label>
        <Select
          value={category || "none"}
          onValueChange={(v) => setCategory(v === "none" ? "" : v)}
        >
          <SelectTrigger>
            <SelectValue placeholder="None" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">None</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.name} value={c.name}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {tags.length > 0 && (
        <div className="space-y-2">
          <Label>Tags</Label>
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <TagChip
                key={tag.name}
                name={tag.name}
                colorHex={tag.colorHex}
                selected={selectedTags.includes(tag.name)}
                onClick={() => toggleTag(tag.name)}
              />
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <Button variant="ghost" className="flex-1" onClick={onClose}>
          Cancel
        </Button>
        <Button
          className="flex-1"
          onClick={() => void handleSave()}
          disabled={saving || !title.trim()}
        >
          {saving ? "Saving..." : "Add to board"}
        </Button>
      </div>
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