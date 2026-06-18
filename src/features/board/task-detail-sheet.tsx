"use client";

import { useCallback, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { format, parseISO } from "date-fns";
import { ArrowRight, Trash2, Undo2 } from "lucide-react";
import { db } from "@/lib/db/schema";
import { suggestTags } from "@/lib/ai/suggest-tags";
import { suggestCategory } from "@/lib/ai/suggest-category";
import { estimateTime } from "@/lib/ai/estimate-time";
import { suggestPlanned } from "@/lib/ai/suggest-planned";
import { isAiConfiguredForFeature } from "@/lib/ai/is-ai-configured";
import { COLUMN_LABELS } from "@/types/task";
import {
  AiSuggestTrigger,
  AiSuggestionFeedback,
} from "./ai-suggestions-panel";
import { useAiSuggestion } from "./use-ai-suggestion";
import {
  updateTask,
  deleteTask,
  carryTaskToNextDay,
  undoLastDayTransition,
  ensureTagExists,
  ensureCategoryExists,
} from "@/lib/db/mutations/tasks";
import type { Task, TaskStatus } from "@/types/task";
import { DEFAULT_COLUMNS, CARRY_FORWARD_STATUSES } from "@/types/task";
import type { BoardPermissions } from "@/lib/utils/board-dates";
import {
  formatBoardDayLabel,
  getBoardPermissions,
  nextBoardDate,
} from "@/lib/utils/board-dates";
import { useMediaQuery } from "@/lib/hooks/use-media-query";
import { confirm } from "@/lib/confirm";
import { toast } from "@/lib/toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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

interface TaskDetailSheetProps {
  taskId: string | null;
  boardDate: string;
  permissions: BoardPermissions;
  onClose: () => void;
}

function TaskDetailForm({
  task,
  boardDate,
  permissions,
  onClose,
}: {
  task: Task;
  boardDate: string;
  permissions: BoardPermissions;
  onClose: () => void;
}) {
  const tags = useLiveQuery(() => db.tags.toArray()) ?? [];
  const categories = useLiveQuery(() => db.categories.toArray()) ?? [];
  const settings = useLiveQuery(() => db.settings.get("default"));

  const tagAiConfigured = isAiConfiguredForFeature(settings, "tagging");
  const categoryAiConfigured = isAiConfiguredForFeature(settings, "categorization");
  const timeAiConfigured = isAiConfiguredForFeature(settings, "time-estimate");
  const plannedAiConfigured = isAiConfiguredForFeature(settings, "planned-suggest");

  const canEdit = permissions.canEditTask(task);
  const canCarry =
    permissions.canCarryForward &&
    task.boardDate === boardDate &&
    CARRY_FORWARD_STATUSES.includes(task.status);

  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? "");
  const [notes, setNotes] = useState(task.notes ?? "");
  const [status, setStatus] = useState<TaskStatus>(task.status);
  const [isPlanned, setIsPlanned] = useState(task.isPlanned);
  const [selectedTags, setSelectedTags] = useState(task.tags);
  const [category, setCategory] = useState(task.category ?? "");
  const [duration, setDuration] = useState(
    task.durationMinutes ? String(task.durationMinutes) : "",
  );
  const [saving, setSaving] = useState(false);
  const [carrying, setCarrying] = useState(false);
  const [undoing, setUndoing] = useState(false);

  const transitions = task.dayTransitions ?? [];
  const lastTransition = transitions[transitions.length - 1];
  const canUndo =
    !!lastTransition &&
    lastTransition.reason === "carry_forward" &&
    !!task.boardDate &&
    !getBoardPermissions(task.boardDate).isReadOnly;

  function toggleTag(name: string) {
    if (!canEdit) return;
    setSelectedTags((prev) =>
      prev.includes(name) ? prev.filter((t) => t !== name) : [...prev, name],
    );
  }

  const taskContext = useCallback(
    () => ({
      title: title.trim() || task.title,
      description: description.trim() || undefined,
      notes: notes.trim() || undefined,
      status: COLUMN_LABELS[status],
      isPlanned,
      tags: selectedTags,
      category: category || undefined,
      durationMinutes: duration ? parseInt(duration, 10) : undefined,
    }),
    [
      title,
      task.title,
      description,
      notes,
      status,
      isPlanned,
      selectedTags,
      category,
      duration,
    ],
  );

  const tagSuggestion = useAiSuggestion({
    aiConfigured: tagAiConfigured && canEdit,
    fetchSuggestion: () =>
      suggestTags(settings, {
        ...taskContext(),
        currentTags: selectedTags,
        availableTags: tags.map((t) => t.name),
      }),
    onAccept: (result) => {
      setSelectedTags((prev) => {
        const merged = new Set([...prev, ...result.tags]);
        return [...merged];
      });
    },
  });

  const categorySuggestion = useAiSuggestion({
    aiConfigured: categoryAiConfigured && canEdit,
    fetchSuggestion: () =>
      suggestCategory(settings, {
        ...taskContext(),
        currentCategory: category || undefined,
        availableCategories: categories.map((c) => c.name),
      }),
    onAccept: (result) => {
      if (result.category) setCategory(result.category);
    },
  });

  const timeSuggestion = useAiSuggestion({
    aiConfigured: timeAiConfigured && canEdit,
    fetchSuggestion: () =>
      estimateTime(settings, {
        ...taskContext(),
        currentDurationMinutes: duration ? parseInt(duration, 10) : undefined,
      }),
    onAccept: (result) => {
      setDuration(String(result.durationMinutes));
    },
  });

  const plannedSuggestion = useAiSuggestion({
    aiConfigured: plannedAiConfigured && canEdit,
    fetchSuggestion: () =>
      suggestPlanned(settings, {
        ...taskContext(),
        currentIsPlanned: isPlanned,
      }),
    onAccept: (result) => {
      setIsPlanned(result.isPlanned);
    },
  });

  async function handleSave() {
    if (!canEdit || !title.trim()) return;
    setSaving(true);
    try {
      for (const tag of selectedTags) await ensureTagExists(tag);
      if (category) await ensureCategoryExists(category);

      await updateTask(task.id, {
        title: title.trim(),
        description: description.trim() || undefined,
        notes: notes.trim() || undefined,
        status,
        isPlanned,
        tags: selectedTags,
        category: category || undefined,
        durationMinutes: duration ? parseInt(duration, 10) : undefined,
      });
      toast.success({
        title: "Task saved",
        description: `"${title.trim()}" has been updated.`,
      });
      onClose();
    } catch (e) {
      toast.error({
        title: "Could not save task",
        description: e instanceof Error ? e.message : "Failed to save task",
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!canEdit) return;
    const confirmed = await confirm({
      title: "Delete this task?",
      description: "This cannot be undone.",
      confirmLabel: "Delete task",
      cancelLabel: "Keep task",
      destructive: true,
    });
    if (!confirmed) return;
    try {
      await deleteTask(task.id);
      toast.success({
        title: "Task deleted",
        description: `"${task.title}" has been removed.`,
      });
      onClose();
    } catch (e) {
      toast.error({
        title: "Could not delete task",
        description: e instanceof Error ? e.message : "Failed to delete task",
      });
    }
  }

  async function handleCarryForward() {
    if (!canCarry) return;
    setCarrying(true);
    try {
      await carryTaskToNextDay(task.id);
      onClose();
    } finally {
      setCarrying(false);
    }
  }

  async function handleUndoLastTransition() {
    if (!canUndo) return;
    setUndoing(true);
    try {
      await undoLastDayTransition(task.id);
    } finally {
      setUndoing(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div
          className="h-8 w-1 rounded-full"
          style={{
            backgroundColor: isPlanned ? "var(--planned)" : "var(--unplanned)",
          }}
        />
        <div className="text-xs text-muted-foreground">
          <span>Created {format(parseISO(task.createdAt), "MMM d, yyyy")}</span>
          {task.boardDate && task.status !== "inbox" && (
            <span className="ml-2">
              · Board {formatBoardDayLabel(task.boardDate)}
            </span>
          )}
        </div>
      </div>

      {!canEdit && (
        <p className="rounded-2xl bg-muted/30 px-4 py-2 text-xs text-muted-foreground">
          {permissions.isReadOnly
            ? "This day is read-only."
            : "View only — edit on today or plan future To Do items."}
        </p>
      )}

      {canCarry && (
        <Button
          variant="secondary"
          size="sm"
          className="w-full gap-1.5"
          onClick={() => void handleCarryForward()}
          disabled={carrying}
        >
          <ArrowRight className="h-3.5 w-3.5" />
          {carrying
            ? "Moving…"
            : `Carry to ${formatBoardDayLabel(nextBoardDate(task.boardDate!))}`}
        </Button>
      )}

      <div className="space-y-2">
        <Label htmlFor="edit-title">Title</Label>
        <Input
          id="edit-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={!canEdit}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="edit-desc">Description</Label>
        <Textarea
          id="edit-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          disabled={!canEdit}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Status</Label>
          <Select
            value={status}
            onValueChange={(v) => setStatus(v as TaskStatus)}
            disabled={!canEdit}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DEFAULT_COLUMNS.map((s) => (
                <SelectItem key={s} value={s}>
                  {COLUMN_LABELS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <Label>Duration (min)</Label>
            <AiSuggestTrigger
              label="Suggest time"
              aiConfigured={timeAiConfigured && canEdit}
              loading={timeSuggestion.state === "loading"}
              disabled={!title.trim() || !timeSuggestion.isOnline}
              onSuggest={() => void timeSuggestion.suggest()}
            />
          </div>
          <Input
            type="number"
            min={1}
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            disabled={!canEdit}
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
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between rounded-2xl bg-muted/30 px-4 py-3">
          <Label>Planned work</Label>
          <div className="flex items-center gap-2">
            <AiSuggestTrigger
              label="Suggest"
              aiConfigured={plannedAiConfigured && canEdit}
              loading={plannedSuggestion.state === "loading"}
              disabled={!title.trim() || !plannedSuggestion.isOnline}
              onSuggest={() => void plannedSuggestion.suggest()}
            />
            <Switch
              checked={isPlanned}
              onCheckedChange={setIsPlanned}
              disabled={!canEdit}
            />
          </div>
        </div>
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

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <Label>Category</Label>
          <AiSuggestTrigger
            label="Suggest category"
            aiConfigured={categoryAiConfigured && canEdit}
            loading={categorySuggestion.state === "loading"}
            disabled={
              !title.trim() ||
              categories.length === 0 ||
              !categorySuggestion.isOnline
            }
            onSuggest={() => void categorySuggestion.suggest()}
          />
        </div>
        <Select
          value={category || "none"}
          onValueChange={(v) => setCategory(v === "none" ? "" : v)}
          disabled={!canEdit}
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
      </div>

      {tags.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <Label>Tags</Label>
            <AiSuggestTrigger
              label="Suggest tags"
              aiConfigured={tagAiConfigured && canEdit}
              loading={tagSuggestion.state === "loading"}
              disabled={!title.trim() || !tagSuggestion.isOnline}
              onSuggest={() => void tagSuggestion.suggest()}
            />
          </div>
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
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="edit-notes">Notes</Label>
        <Textarea
          id="edit-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="Reflections, context, how it felt..."
          disabled={!canEdit}
        />
      </div>

      {transitions.length > 0 && (
        <div className="space-y-2">
          <Label>Day history</Label>
          <ul className="space-y-1.5 rounded-2xl bg-muted/20 px-3 py-3 text-xs text-muted-foreground sm:px-4">
            {transitions.map((t, i) => {
              const isLast = i === transitions.length - 1;
              return (
                <li
                  key={`${t.at}-${i}`}
                  className="flex items-center justify-between gap-2"
                >
                  <span className="min-w-0">
                    {formatBoardDayLabel(t.fromBoardDate)} →{" "}
                    {formatBoardDayLabel(t.toBoardDate)}
                    {t.fromStatus === "doing" && " (was in progress)"}
                  </span>
                  {isLast && canUndo && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 shrink-0 gap-1 px-2 text-[11px]"
                      onClick={() => void handleUndoLastTransition()}
                      disabled={undoing}
                    >
                      <Undo2 className="h-3 w-3" />
                      {undoing ? "…" : "Undo"}
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <div className="flex gap-3 pt-2">
        {canEdit && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => void handleDelete()}
            className="text-muted-foreground hover:text-red-400"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
        <Button variant="ghost" className="flex-1" onClick={onClose}>
          {canEdit ? "Cancel" : "Close"}
        </Button>
        {canEdit && (
          <Button
            className="flex-1"
            onClick={() => void handleSave()}
            disabled={saving || !title.trim()}
          >
            {saving ? "Saving..." : "Save"}
          </Button>
        )}
      </div>
    </div>
  );
}

export function TaskDetailSheet({
  taskId,
  boardDate,
  permissions,
  onClose,
}: TaskDetailSheetProps) {
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const task = useLiveQuery(
    () => (taskId ? db.tasks.get(taskId) : undefined),
    [taskId],
  );
  const open = taskId !== null;

  const form = task ? (
    <TaskDetailForm
      key={`${task.id}-${task.boardDate}-${task.dayTransitions?.length ?? 0}`}
      task={task}
      boardDate={boardDate}
      permissions={permissions}
      onClose={onClose}
    />
  ) : null;

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Task details</DialogTitle>
          </DialogHeader>
          {form}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Task details</SheetTitle>
        </SheetHeader>
        {form}
      </SheetContent>
    </Sheet>
  );
}