"use client";

import { Download, Share, X } from "lucide-react";
import { useInstallPrompt } from "@/lib/hooks/use-install-prompt";
import { Button } from "@/components/ui/button";

export function InstallPrompt() {
  const { canInstall, isIOS, installed, showPrompt, install, dismiss } =
    useInstallPrompt();

  if (!showPrompt || installed) return null;

  return (
    <div className="fixed bottom-20 left-3 right-3 z-50 mx-auto max-w-lg lg:bottom-6 lg:left-auto lg:right-6">
      <div className="rounded-2xl border border-border bg-card/95 p-4 shadow-lg backdrop-blur-lg">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/15">
            <Download className="h-5 w-5 text-accent" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-foreground">
              Install Hesia
            </p>
            <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
              {isIOS && !canInstall ? (
                <>
                  Tap <Share className="inline h-3 w-3" /> Share, then{" "}
                  <strong className="font-medium text-foreground">
                    Add to Home Screen
                  </strong>{" "}
                  for a full-screen app experience.
                </>
              ) : (
                "Add to your home screen for quick access and offline use."
              )}
            </p>
            <div className="mt-3 flex gap-2">
              {canInstall && (
                <Button size="sm" className="h-9" onClick={() => void install()}>
                  Install
                </Button>
              )}
              <Button size="sm" variant="ghost" className="h-9" onClick={dismiss}>
                Not now
              </Button>
            </div>
          </div>
          <button
            type="button"
            onClick={dismiss}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-muted-foreground hover:text-foreground"
            aria-label="Dismiss install prompt"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}