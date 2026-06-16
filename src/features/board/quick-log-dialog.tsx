"use client";

import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { format, parseISO } from "date-fns";
import Link from "next/link";
import { Sparkles, Wand2 } from "lucide-react";
import { db } from "@/lib/db/schema";
import {
  createTask,
  ensureTagExists,
  ensureCategoryExists,
} from "@/lib/db/mutations/tasks";
import { inferFromQuickLog } from "@/lib/utils/task-inference";
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
  const tags = useLiveQuery(() => db.tags.toArray()) ?? [];
  const categories = useLiveQuery(() => db.categories.toArray()) ?? [];

  const allowedStatuses = useMemo(
    () => DEFAULT_COLUMNS.filter((s) => permissions.canAdd(s)),
    [permissions],
  );

  const defaultStatus = allowedStatuses.includes(initialStatus)
    ? initialStatus
    : allowedStatuses[0] ?? "todo";

  const [text, setText] = useState("");
  const [title, setTitle] = useState("");
  const [status, setStatus] = useState<TaskStatus>(defaultStatus);
  const [isPlanned, setIsPlanned] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [category, setCategory] = useState<string>("");
  const [duration, setDuration] = useState<string>("");
  const [saving, setSaving] = useState(false);

  function clampStatus(next: TaskStatus): TaskStatus {
    return allowedStatuses.includes(next) ? next : defaultStatus;
  }

  function handleTextChange(value: string) {
    setText(value);
    if (value.length > 10) {
      const inferred = inferFromQuickLog(value);
      setStatus(clampStatus(inferred.status));
      setIsPlanned(inferred.isPlanned);
      if (!title) setTitle(value.trim());
    }
  }

  function applyInference() {
    if (!text.trim()) return;
    const inferred = inferFromQuickLog(text);
    setTitle(text.trim());
    setStatus(clampStatus(inferred.status));
    setIsPlanned(inferred.isPlanned);
    setSelectedTags(inferred.suggestedTags);
    if (inferred.suggestedCategory) setCategory(inferred.suggestedCategory);
    if (inferred.durationMinutes) setDuration(String(inferred.durationMinutes));
  }

  function toggleTag(name: string) {
    setSelectedTags((prev) =>
      prev.includes(name) ? prev.filter((t) => t !== name) : [...prev, name],
    );
  }

  async function handleSave() {
    const finalTitle = title.trim() || text.trim();
    if (!finalTitle || !permissions.canAdd(status)) return;

    setSaving(true);
    try {
      for (const tag of selectedTags) await ensureTagExists(tag);
      if (category) await ensureCategoryExists(category);

      await createTask({
        title: finalTitle,
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
      <div className="space-y-2">
        <Label htmlFor="quick-text">What happened?</Label>
        <Textarea
          id="quick-text"
          placeholder='e.g. "Just finished 25min yoga" or "Plan Q3 content calendar"'
          value={text}
          onChange={(e) => handleTextChange(e.target.value)}
          rows={3}
          autoFocus
        />
      </div>

      <div className="flex gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={applyInference}
          disabled={!text.trim()}
        >
          <Wand2 className="h-4 w-4" />
          Apply suggestions
        </Button>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/chat">
            <Sparkles className="h-4 w-4" />
            Ask in chat
          </Link>
        </Button>
      </div>

      <div className="space-y-2">
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Task title"
        />
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
          disabled={saving || (!title.trim() && !text.trim())}
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