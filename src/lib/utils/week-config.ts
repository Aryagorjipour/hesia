/** 0 = Sunday … 6 = Saturday (matches date-fns `weekStartsOn`) */
export type WeekStartsOn = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export const DEFAULT_WEEK_STARTS_ON: WeekStartsOn = 1;

export const WEEK_START_OPTIONS: ReadonlyArray<{
  value: WeekStartsOn;
  label: string;
  short: string;
}> = [
  { value: 0, label: "Sunday", short: "Sun" },
  { value: 1, label: "Monday", short: "Mon" },
  { value: 2, label: "Tuesday", short: "Tue" },
  { value: 3, label: "Wednesday", short: "Wed" },
  { value: 4, label: "Thursday", short: "Thu" },
  { value: 5, label: "Friday", short: "Fri" },
  { value: 6, label: "Saturday", short: "Sat" },
];

export function normalizeWeekStartsOn(value?: number | null): WeekStartsOn {
  if (value === undefined || value === null) return DEFAULT_WEEK_STARTS_ON;
  if (value >= 0 && value <= 6) return value as WeekStartsOn;
  return DEFAULT_WEEK_STARTS_ON;
}

export function getWeekStartsOnLabel(value: WeekStartsOn): string {
  return (
    WEEK_START_OPTIONS.find((o) => o.value === value)?.label ?? "Monday"
  );
}