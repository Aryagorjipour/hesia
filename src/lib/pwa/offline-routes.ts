/**
 * Routes that must load offline after a cold start (no prior runtime cache).
 * Paths use trailing slashes to match next.config trailingSlash: true.
 */
export const OFFLINE_CAPABLE_PATHS = [
  "/",
  "/board/",
  "/reports/",
  "/settings/",
  "/settings/account/",
  "/settings/appearance/",
  "/settings/ai/",
  "/settings/integrations/",
  "/settings/app/",
  "/settings/data/",
  "/settings/about/",
  "/settings/tags/",
  "/tags/",
  "/offline/",
] as const;

export type OfflineCapablePath = (typeof OFFLINE_CAPABLE_PATHS)[number];

/** Map a URL path to its static-export index.html file (relative to out/). */
export function offlinePathToHtmlFile(path: string): string {
  const normalized = path.endsWith("/") ? path : `${path}/`;
  if (normalized === "/") return "index.html";
  return `${normalized.slice(1)}index.html`;
}

export function withTrailingSlash(path: string): string {
  if (path === "/") return "/";
  return path.endsWith("/") ? path : `${path}/`;
}

export function joinBasePath(basePath: string, path: string): string {
  const base = basePath.replace(/\/$/, "");
  const normalized = withTrailingSlash(path);
  if (!base) return normalized;
  return `${base}${normalized}`;
}