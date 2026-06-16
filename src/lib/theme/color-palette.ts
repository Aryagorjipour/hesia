/** Curated palette — calm, readable on dark UI */
export const HESIA_COLOR_PRESETS = [
  "#6366f1",
  "#8b5cf6",
  "#a78bfa",
  "#ec4899",
  "#f472b6",
  "#ef4444",
  "#f97316",
  "#eab308",
  "#10b981",
  "#14b8a6",
  "#06b6d4",
  "#3b82f6",
  "#60a5fa",
  "#71717a",
  "#94a3b8",
  "#fbbf24",
] as const;

const HEX_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

export function normalizeHexColor(value: string): string | null {
  const trimmed = value.trim();
  if (!HEX_RE.test(trimmed)) return null;
  if (trimmed.length === 4) {
    const [, r, g, b] = trimmed;
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }
  return trimmed.toLowerCase();
}

export function isValidHexColor(value: string): boolean {
  return normalizeHexColor(value) !== null;
}