import { isDesktop } from "@/lib/platform";

export async function platformInvoke<T>(
  command: string,
  args?: Record<string, unknown>,
  httpFallback?: () => Promise<T>,
): Promise<T> {
  if (isDesktop()) {
    const { invoke } = await import("@tauri-apps/api/core");
    return invoke<T>(command, args);
  }
  if (httpFallback) return httpFallback();
  throw new Error(`platformInvoke: no HTTP fallback for ${command} on web`);
}
