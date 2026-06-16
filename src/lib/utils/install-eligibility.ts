export type InstallBlockReason = "insecure" | "no_service_worker";

export function isSecureInstallContext() {
  if (typeof window === "undefined") return false;
  return window.isSecureContext;
}

export function isLocalDevWithoutSw() {
  return (
    process.env.NODE_ENV === "development" &&
    process.env.NEXT_PUBLIC_SERWIST_DEV !== "1"
  );
}

export function getInstallBlockReason(): InstallBlockReason | null {
  if (typeof window === "undefined") return null;
  if (!isSecureInstallContext()) return "insecure";
  if (isLocalDevWithoutSw()) return "no_service_worker";
  return null;
}

export async function hasActiveServiceWorker() {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
    return false;
  }
  const registration = await navigator.serviceWorker.getRegistration();
  return Boolean(registration?.active);
}

export async function resolveInstallBlockReason(): Promise<InstallBlockReason | null> {
  const immediate = getInstallBlockReason();
  if (immediate) return immediate;
  if (!(await hasActiveServiceWorker())) return "no_service_worker";
  return null;
}

export function getInstallBlockMessage(
  reason: InstallBlockReason,
  liveUrl: string,
): string {
  if (reason === "insecure") {
    return `Firefox only shows Install on secure (HTTPS) pages. Your connection is marked Not Secure, so the install option is hidden. Open the live app at ${liveUrl} instead.`;
  }
  return `Install requires the offline service worker, which is not active in local dev. Open the live app at ${liveUrl} in Firefox to install.`;
}