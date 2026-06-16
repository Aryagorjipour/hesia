import type { AppSettings, PresetWorkspaceConfig, ZenPreset } from "@/types/settings";
import type { TaskStatus } from "@/types/task";
import { COLUMN_LABELS, DEFAULT_COLUMNS } from "@/types/task";

const KANBAN_STATUSES: TaskStatus[] = ["inbox", "todo", "doing", "done"];

export function resolveColumnLabels(
  settings: AppSettings | undefined,
): Record<TaskStatus, string> {
  const custom = settings?.columnNames;
  return DEFAULT_COLUMNS.reduce(
    (acc, status) => {
      acc[status] = custom?.[status] ?? COLUMN_LABELS[status];
      return acc;
    },
    {} as Record<TaskStatus, string>,
  );
}

export function getPresetWorkspaceConfig(
  settings: AppSettings | undefined,
  preset: ZenPreset,
): PresetWorkspaceConfig | undefined {
  return settings?.presetWorkspaceConfigs?.[preset];
}

export function buildColumnNamesFromPresetConfig(
  config: PresetWorkspaceConfig | undefined,
): AppSettings["columnNames"] | undefined {
  if (!config?.columnNames) return undefined;
  const entries = Object.entries(config.columnNames).filter(
    (entry): entry is [TaskStatus, string] => !!entry[1],
  );
  if (entries.length === 0) return undefined;
  return Object.fromEntries(entries) as AppSettings["columnNames"];
}

export function extractKanbanColumnDraft(
  columnNames: Record<TaskStatus, string> | undefined,
): Record<string, string> {
  return KANBAN_STATUSES.reduce(
    (acc, status) => {
      acc[status] = columnNames?.[status] ?? COLUMN_LABELS[status];
      return acc;
    },
    {} as Record<string, string>,
  );
}

export async function applyZenPresetWithWorkspace(
  preset: ZenPreset,
  settings: AppSettings,
  updateSettings: (
    patch: Partial<AppSettings>,
  ) => Promise<void>,
): Promise<void> {
  const presetConfig = getPresetWorkspaceConfig(settings, preset);
  await updateSettings({
    zenPreset: preset,
    columnNames: buildColumnNamesFromPresetConfig(presetConfig),
  });
}