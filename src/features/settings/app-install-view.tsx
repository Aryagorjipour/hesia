"use client";

import { Download, Monitor, Share, Smartphone, Check } from "lucide-react";
import { useInstallPrompt } from "@/lib/hooks/use-install-prompt";
import { APP_META } from "@/lib/app/meta";
import { Button } from "@/components/ui/button";

export function AppInstallView() {
  const { canInstall, isIOS, installed, install } = useInstallPrompt();

  return (
    <div className="space-y-6 overflow-y-auto p-4 sm:p-6 lg:p-8">
      <div className="rounded-2xl border border-border bg-card/50 p-4 sm:p-5">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent/15">
            <Smartphone className="h-5 w-5 text-accent" />
          </div>
          <div className="min-w-0 space-y-1">
            <p className="text-sm font-medium text-foreground">Install status</p>
            {installed ? (
              <p className="flex items-center gap-1.5 text-xs text-planned">
                <Check className="h-3.5 w-3.5" />
                Running as an installed app
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Install Hesia for a full-screen experience and faster access.
              </p>
            )}
          </div>
        </div>

        {canInstall && !installed && (
          <Button
            className="mt-4 w-full gap-2 sm:w-auto"
            onClick={() => void install()}
          >
            <Download className="h-4 w-4" />
            Install Hesia
          </Button>
        )}
      </div>

      {!installed && (
        <div className="rounded-2xl border border-border bg-card/50 p-4 sm:p-5">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent/15">
              <Monitor className="h-5 w-5 text-accent" />
            </div>
            <div className="min-w-0 space-y-1">
              <p className="text-sm font-medium text-foreground">
                Install on desktop
              </p>
              <p className="text-xs leading-relaxed text-muted-foreground">
                Open{" "}
                <a
                  href={APP_META.siteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent hover:text-accent/80"
                >
                  {APP_META.siteUrl}
                </a>{" "}
                in Chrome or Edge, then use the install icon in the address bar
                (or Settings → App → Install here when prompted).
              </p>
            </div>
          </div>
        </div>
      )}

      {!installed && isIOS && (
        <div className="rounded-2xl border border-border bg-card/50 p-4 sm:p-5">
          <p className="text-sm font-medium text-foreground">
            Add to Home Screen (iOS)
          </p>
          <ol className="mt-3 space-y-2 text-xs leading-relaxed text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-medium">
                1
              </span>
              <span>
                Tap the <Share className="inline h-3 w-3" /> Share button in
                Safari
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-medium">
                2
              </span>
              <span>Scroll down and tap &quot;Add to Home Screen&quot;</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-medium">
                3
              </span>
              <span>Tap Add — Hesia opens full-screen like a native app</span>
            </li>
          </ol>
        </div>
      )}

      <div className="rounded-2xl border border-border/60 bg-card/40 p-4 sm:p-5">
        <p className="text-sm font-medium text-foreground">Offline use</p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          After your first visit, board, reports, and settings work without a
          connection. AI chat and weekly reflections need internet.
        </p>
      </div>
    </div>
  );
}