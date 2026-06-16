"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { format, parseISO } from "date-fns";
import { ArrowRight, Trash2, Undo2 } from "lucide-react";
import { db } from "@/lib/db/schema";
import {
  updateTask,
  deleteTask,
  carryTaskToNextDay,
  undoLastDayTransition,
  ensureTagExists,
  ensureCategoryExists,
} from "@/lib/db/mutations/tasks";
import type { Task, TaskStatus } from "@/types/task";
import {
  COLUMN_LABELS,
  DEFAULT_COLUMNS,
  CARRY_FORWARD_STATUSES,
} from "@/types/task";
import type { BoardPermissions } from "@/lib/utils/board-dates";
import {
  formatBoardDayLabel,
  getBoardPermissions,
  nextBoardDate,
} from "@/lib/utils/board-dates";
import { useMediaQuery } from "@/lib/hooks/use-media-query";
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
      onClose();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!canEdit) return;
    if (!confirm("Delete this task? This cannot be undone.")) return;
    await deleteTask(task.id);
    onClose();
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
          <Label>Duration (min)</Label>
          <Input
            type="number"
            min={1}
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            disabled={!canEdit}
          />
        </div>
      </div>

      <div className="flex items-center justify-between rounded-2xl bg-muted/30 px-4 py-3">
        <Label>Planned work</Label>
        <Switch
          checked={isPlanned}
          onCheckedChange={setIsPlanned}
          disabled={!canEdit}
        />
      </div>

      <div className="space-y-2">
        <Label>Category</Label>
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