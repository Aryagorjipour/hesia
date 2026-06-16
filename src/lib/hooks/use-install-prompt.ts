"use client";

import { useCallback, useEffect, useState } from "react";
import { APP_META } from "@/lib/app/meta";
import {
  isFirefox,
  isFirefoxMobile,
  isIOS,
  isStandalone,
  needsManualInstall,
} from "@/lib/utils/browser";
import {
  getInstallBlockReason,
  resolveInstallBlockReason,
  type InstallBlockReason,
} from "@/lib/utils/install-eligibility";

const DISMISS_KEY = "hesia-install-dismissed";
const DISMISS_TTL_MS = 7 * 24 * 60 * 60 * 1000;

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
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
  return needsManualInstall();
}

export function useInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(() =>
    typeof window === "undefined" ? false : isStandalone(),
  );
  const [showPrompt, setShowPrompt] = useState(getInitialShowPrompt);
  const [installBlockReason, setInstallBlockReason] =
    useState<InstallBlockReason | null>(() => getInstallBlockReason());

  useEffect(() => {
    let cancelled = false;

    void resolveInstallBlockReason().then((reason) => {
      if (!cancelled) setInstallBlockReason(reason);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (isStandalone() || wasDismissedRecently()) return;

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowPrompt(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);

    if (needsManualInstall() && !isStandalone()) {
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
    isFirefox: isFirefox(),
    isFirefoxMobile: isFirefoxMobile(),
    needsManualInstall: needsManualInstall(),
    installBlockReason,
    installBlocked: installBlockReason !== null,
    liveInstallUrl: APP_META.siteUrl,
    installed,
    showPrompt: showPrompt && !installed,
    install,
    dismiss,
  };
}