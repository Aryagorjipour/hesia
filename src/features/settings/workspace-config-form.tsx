"use client";

import { useState } from "react";
import { Save } from "lucide-react";
import type { ZenPreset, PresetWorkspaceConfig } from "@/types/settings";
import type { TaskStatus } from "@/types/task";
import { COLUMN_LABELS } from "@/types/task";
import { ZEN_PRESETS } from "@/lib/theme/presets";
import { toast } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const KANBAN_COLUMNS: TaskStatus[] = ["inbox", "todo", "doing", "done"];

function buildInitialDraft(
  preset: ZenPreset,
  initialConfig?: PresetWorkspaceConfig,
  activeColumnNames?: Partial<Record<TaskStatus, string>>,
) {
  const columnDraft = KANBAN_COLUMNS.reduce(
    (acc, status) => {
      acc[status] =
        initialConfig?.columnNames?.[status] ??
        activeColumnNames?.[status] ??
        COLUMN_LABELS[status];
      return acc;
    },
    {} as Record<string, string>,
  );

  return {
    columnDraft,
    boardSubtitle: initialConfig?.boardSubtitle ?? "",
  };
}

function WorkspaceConfigFields({
  preset,
  initialConfig,
  activeColumnNames,
  onSave,
}: WorkspaceConfigFormProps) {
  const initial = buildInitialDraft(preset, initialConfig, activeColumnNames);
  const [columnDraft, setColumnDraft] = useState(initial.columnDraft);
  const [boardSubtitle, setBoardSubtitle] = useState(initial.boardSubtitle);
  const [saving, setSaving] = useState(false);

  const presetName = ZEN_PRESETS[preset].name;

  async function handleSave() {
    setSaving(true);
    try {
      const columnNames = KANBAN_COLUMNS.reduce(
        (acc, status) => {
          const value = columnDraft[status]?.trim();
          if (value && value !== COLUMN_LABELS[status]) {
            acc[status] = value;
          }
          return acc;
        },
        {} as Partial<Record<TaskStatus, string>>,
      );

      await onSave(preset, {
        columnNames:
          Object.keys(columnNames).length > 0 ? columnNames : undefined,
        boardSubtitle: boardSubtitle.trim() || undefined,
      });
      toast.success({
        title: "Workspace saved",
        description: `Layout updated for ${presetName}.`,
      });
    } catch (e) {
      toast.error({
        title: "Could not save workspace",
        description: e instanceof Error ? e.message : "Save failed",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4 rounded-2xl border border-border/60 bg-card/40 p-4 sm:p-5">
      <div>
        <h3 className="text-sm font-medium text-foreground">
          Workspace for {presetName}
        </h3>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Save column labels and board subtitle for this zen preset. Switching
          presets restores each preset&apos;s saved layout.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {KANBAN_COLUMNS.map((status) => (
          <div key={status} className="space-y-1.5">
            <Label htmlFor={`col-${preset}-${status}`} className="capitalize">
              {COLUMN_LABELS[status]} column
            </Label>
            <Input
              id={`col-${preset}-${status}`}
              value={columnDraft[status] ?? ""}
              onChange={(e) =>
                setColumnDraft((prev) => ({
                  ...prev,
                  [status]: e.target.value,
                }))
              }
              placeholder={COLUMN_LABELS[status]}
            />
          </div>
        ))}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={`subtitle-${preset}`}>Board subtitle</Label>
        <Input
          id={`subtitle-${preset}`}
          value={boardSubtitle}
          onChange={(e) => setBoardSubtitle(e.target.value)}
          placeholder="e.g. Deep work & calm admin"
          maxLength={120}
        />
      </div>

      <Button
        size="sm"
        variant="secondary"
        className="gap-1.5"
        onClick={() => void handleSave()}
        disabled={saving}
      >
        <Save className="h-3.5 w-3.5" />
        {saving ? "Saving…" : `Save for ${presetName}`}
      </Button>
    </div>
  );
}

interface WorkspaceConfigFormProps {
  preset: ZenPreset;
  initialConfig?: PresetWorkspaceConfig;
  activeColumnNames?: Partial<Record<TaskStatus, string>>;
  onSave: (preset: ZenPreset, config: PresetWorkspaceConfig) => Promise<void>;
}

export function WorkspaceConfigForm(props: WorkspaceConfigFormProps) {
  const configKey = JSON.stringify({
    preset: props.preset,
    config: props.initialConfig,
    columns: props.activeColumnNames,
  });

  return <WorkspaceConfigFields key={configKey} {...props} />;
}