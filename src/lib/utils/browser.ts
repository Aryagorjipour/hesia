export function isIOS() {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

/** Firefox desktop and Android — does not include FxiOS (handled as iOS). */
export function isFirefox() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  return /Firefox/i.test(ua) && !/Seamonkey/i.test(ua);
}

export function isFirefoxMobile() {
  return isFirefox() && /Android|Mobile/i.test(navigator.userAgent);
}

export function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in navigator &&
      (navigator as Navigator & { standalone?: boolean }).standalone === true)
  );
}

/** Browsers that support install but require manual steps (no beforeinstallprompt). */
export function needsManualInstall() {
  return isIOS() || isFirefox();
}