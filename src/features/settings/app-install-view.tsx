"use client";

import { useEffect, useState } from "react";
import {
  Download,
  Menu,
  Monitor,
  Share,
  Smartphone,
  Check,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import {
  FirefoxDesktopSteps,
  InstallBlockNotice,
  StepList,
} from "@/components/pwa/install-guidance";
import { useInstallPrompt } from "@/lib/hooks/use-install-prompt";
import { APP_META } from "@/lib/app/meta";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { OfflineDiagnosticsPanel } from "./offline-diagnostics-panel";
import { DesktopUpdatePanel } from "./desktop-update-panel";
import { isDesktop } from "@/lib/platform";
import { db } from "@/lib/db/schema";
import { useLiveQuery } from "dexie-react-hooks";

function DesktopAppTab() {
  const [version, setVersion] = useState<string | null>(null);
  const [autostartEnabled, setAutostartEnabled] = useState(false);
  const settings = useLiveQuery(() => db.settings.get("default"));

  useEffect(() => {
    import("@tauri-apps/api/core").then(({ invoke }) => {
      void invoke<string>("get_app_version").then(setVersion).catch(() => {});
      void invoke<boolean>("get_autostart")
        .then(setAutostartEnabled)
        .catch(() => {});
    });
  }, []);

  async function toggleAutostart(enabled: boolean) {
    setAutostartEnabled(enabled);
    const { invoke } = await import("@tauri-apps/api/core");
    await invoke("set_autostart", { enabled }).catch(() => {
      setAutostartEnabled(!enabled);
    });
  }

  async function toggleCloseToTray(enabled: boolean) {
    if (!settings) return;
    await db.settings.update("default", { desktopCloseToTray: enabled });
  }

  return (
    <div className="space-y-4 p-4 sm:p-6 lg:p-8">
      <div className="rounded-2xl border border-border bg-card/50 p-4 sm:p-5">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground">App version</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {version ? `v${version}` : "—"}
            </p>
          </div>
          <RefreshCw className="h-4 w-4 shrink-0 text-muted-foreground" />
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card/50 p-4 sm:p-5 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <Label
            htmlFor="autostart-toggle"
            className="min-w-0 cursor-pointer space-y-0.5"
          >
            <p className="text-sm font-medium text-foreground">
              Launch at login
            </p>
            <p className="text-xs text-muted-foreground">
              Start Hesia automatically when you log in
            </p>
          </Label>
          <Switch
            id="autostart-toggle"
            checked={autostartEnabled}
            onCheckedChange={(v) => void toggleAutostart(v)}
          />
        </div>

        <div className="flex items-center justify-between gap-4">
          <Label
            htmlFor="tray-toggle"
            className="min-w-0 cursor-pointer space-y-0.5"
          >
            <p className="text-sm font-medium text-foreground">
              Close to tray
            </p>
            <p className="text-xs text-muted-foreground">
              Keep Hesia running in the system tray when the window is closed
            </p>
          </Label>
          <Switch
            id="tray-toggle"
            checked={settings?.desktopCloseToTray ?? false}
            onCheckedChange={(v) => void toggleCloseToTray(v)}
          />
        </div>
      </div>

      <DesktopUpdatePanel currentVersion={version} />
    </div>
  );
}

export function AppInstallView() {
  if (isDesktop()) {
    return <DesktopAppTab />;
  }

  return <WebInstallView />;
}

function WebInstallView() {
  const {
    canInstall,
    isIOS,
    isFirefox,
    isFirefoxMobile,
    installBlockReason,
    installBlocked,
    liveInstallUrl,
    installed,
    install,
  } = useInstallPrompt();

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      {installBlocked && installBlockReason && !installed && (
        <div className="rounded-2xl border border-unplanned/30 bg-unplanned/10 p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-unplanned" />
            <div className="min-w-0 space-y-3">
              <p className="text-sm font-medium text-foreground">
                Install unavailable on this page
              </p>
              <InstallBlockNotice reason={installBlockReason} />
              <Button size="sm" className="h-9" asChild>
                <a href={liveInstallUrl} target="_blank" rel="noopener noreferrer">
                  Open live app
                </a>
              </Button>
            </div>
          </div>
        </div>
      )}

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

      {!installed && !isFirefox && !isIOS && (
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
                in Chrome, Edge, or Firefox, then use the install icon in the
                address bar (or Settings → App → Install here when prompted).
              </p>
            </div>
          </div>
        </div>
      )}

      {!installed && isFirefox && !installBlocked && (
        <div className="rounded-2xl border border-border bg-card/50 p-4 sm:p-5">
          <p className="text-sm font-medium text-foreground">
            Install in Firefox
          </p>
          {isFirefoxMobile ? (
            <StepList
              steps={[
                <>
                  Open the <Menu className="inline h-3 w-3" /> menu (three dots)
                  in the toolbar
                </>,
                <>
                  Tap <strong className="font-medium text-foreground">Install</strong>{" "}
                  — Hesia is added to your home screen
                </>,
                "Launch Hesia from your home screen for a full-screen app experience",
              ]}
            />
          ) : (
            <FirefoxDesktopSteps />
          )}
        </div>
      )}

      {!installed && isIOS && (
        <div className="rounded-2xl border border-border bg-card/50 p-4 sm:p-5">
          <p className="text-sm font-medium text-foreground">
            Add to Home Screen (iOS)
          </p>
          <StepList
            steps={[
              <>
                Tap the <Share className="inline h-3 w-3" /> Share button in
                Safari
              </>,
              <>Scroll down and tap &quot;Add to Home Screen&quot;</>,
              "Tap Add — Hesia opens full-screen like a native app",
            ]}
          />
        </div>
      )}

      <div className="rounded-2xl border border-border/60 bg-card/40 p-4 sm:p-5">
        <p className="text-sm font-medium text-foreground">Offline use</p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          After your first visit, board, reports, and settings work without a
          connection. AI chat and weekly reflections need internet.
        </p>
      </div>

      <OfflineDiagnosticsPanel />
    </div>
  );
}
