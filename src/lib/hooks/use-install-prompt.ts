"use client";

import { useCallback, useEffect, useState } from "react";

const DISMISS_KEY = "hesia-install-dismissed";
const DISMISS_TTL_MS = 7 * 24 * 60 * 60 * 1000;

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isIOS() {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in navigator &&
      (navigator as Navigator & { standalone?: boolean }).standalone === true)
  );
}

function wasDismissedRecently() {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    const dismissedAt = Number(raw);
    return Date.now() - dismissedAt < DISMISS_TTL_MS;
  } catch {
    return false;
  }
}

function getInitialShowPrompt() {
  if (typeof window === "undefined") return false;
  if (isStandalone() || wasDismissedRecently()) return false;
  return isIOS();
}

export function useInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(() =>
    typeof window === "undefined" ? false : isStandalone(),
  );
  const [showPrompt, setShowPrompt] = useState(getInitialShowPrompt);

  useEffect(() => {
    if (isStandalone() || wasDismissedRecently()) return;

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowPrompt(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);

    if (isIOS() && !isStandalone()) {
      const timer = window.setTimeout(() => setShowPrompt(true), 3000);
      return () => {
        window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
        window.clearTimeout(timer);
      };
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
    };
  }, []);

  const dismiss = useCallback(() => {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      // ignore
    }
    setShowPrompt(false);
  }, []);

  const install = useCallback(async () => {
    if (!deferredPrompt) return false;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setShowPrompt(false);
    if (outcome === "accepted") {
      setInstalled(true);
      return true;
    }
    dismiss();
    return false;
  }, [deferredPrompt, dismiss]);

  return {
    canInstall: !!deferredPrompt,
    isIOS: isIOS(),
    installed,
    showPrompt: showPrompt && !installed,
    install,
    dismiss,
  };
}