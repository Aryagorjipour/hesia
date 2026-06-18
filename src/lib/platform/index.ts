export type PlatformCapabilities = {
  hasPWAInstall: boolean;
  hasServiceWorker: boolean;
  hasNativeNotifications: boolean;
  hasNativeRelay: boolean;
  hasNativeTray: boolean;
};

/**
 * True when running inside a Tauri WebView. Safe to call during SSR (returns false).
 * Do not call window.__TAURI_INTERNALS__ directly elsewhere in the codebase —
 * use this function as the single gating point.
 */
export function isDesktop(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

export function isWeb(): boolean {
  return !isDesktop();
}

export function getPlatformCapabilities(): Readonly<PlatformCapabilities> {
  const d = isDesktop();
  return Object.freeze({
    hasPWAInstall: !d,
    hasServiceWorker: !d,
    hasNativeNotifications: d,
    hasNativeRelay: d,
    hasNativeTray: d,
  });
}
