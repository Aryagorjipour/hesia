export const APP_SLUG = "hesia";
export const APP_NAME = "Hesia";
export const REPO_OWNER = "Aryagorjipour";
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  `https://${REPO_OWNER.toLowerCase()}.github.io/${APP_SLUG}`;

export function withBasePath(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  if (!BASE_PATH) return normalized;
  return `${BASE_PATH.replace(/\/$/, "")}${normalized}`;
}