"use client";

import { TagCategoryFields } from "@/features/board/tag-category-fields";
import type { TaskSuggestionFields } from "@/lib/chat/task-suggestion";
import { COLUMN_LABELS, DEFAULT_COLUMNS, type TaskStatus } from "@/types/task";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface TaskSuggestionFieldsEditorProps {
  value: TaskSuggestionFields;
  onChange: (value: TaskSuggestionFields) => void;
  disabled?: boolean;
}

export function TaskSuggestionFieldsEditor({
  value,
  onChange,
  disabled = false,
}: TaskSuggestionFieldsEditorProps) {
  function patch(partial: Partial<TaskSuggestionFields>) {
    onChange({ ...value, ...partial });
  }

  return (
    <div className="space-y-3 border-t border-border/40 pt-3">
      <div className="space-y-1">
        <Label className="text-xs">Title</Label>
        <Input
          value={value.title}
          onChange={(e) => patch({ title: e.target.value })}
          className="h-8 text-sm"
          disabled={disabled}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Column</Label>
          <Select
            value={value.status}
            onValueChange={(v) => patch({ status: v as TaskStatus })}
            disabled={disabled}
          >
            <SelectTrigger className="h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DEFAULT_COLUMNS.filter((s) => s !== "archived").map((s) => (
                <SelectItem key={s} value={s}>
                  {COLUMN_LABELS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Duration (min)</Label>
          <Input
            type="number"
            min={1}
            value={value.durationMinutes ?? ""}
            onChange={(e) =>
              patch({
                durationMinutes: e.target.value
                  ? parseInt(e.target.value, 10)
                  : undefined,
              })
            }
            className="h-8 text-sm"
            disabled={disabled}
          />
        </div>
      </div>

      <div className="flex items-center justify-between rounded-xl bg-muted/20 px-3 py-2">
        <Label className="text-xs">Planned work</Label>
        <Switch
          checked={value.isPlanned}
          onCheckedChange={(v) => patch({ isPlanned: v })}
          disabled={disabled}
        />
      </div>

      <div className="space-y-1">
        <Label className="text-xs">Description</Label>
        <Textarea
          value={value.description ?? ""}
          onChange={(e) => patch({ description: e.target.value })}
          rows={2}
          className="text-sm"
          disabled={disabled}
        />
      </div>

      <TagCategoryFields
        selectedTags={value.tags}
        onTagsChange={(tags) => patch({ tags })}
        category={value.category ?? ""}
        onCategoryChange={(category) => patch({ category: category || undefined })}
        disabled={disabled}
      />
    </div>
  );
}