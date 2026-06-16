"use client";

import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import {
  ChevronRight,
  Palette,
  Bot,
  Database,
  Info,
  Smartphone,
  User,
} from "lucide-react";
import { MobilePageHeader } from "@/components/layout/mobile-page-header";
import { SettingsScrollArea } from "@/components/settings/settings-scroll-area";
import { db } from "@/lib/db/schema";
import { Card, CardContent } from "@/components/ui/card";
import { ZEN_PRESETS } from "@/lib/theme/presets";
import { useSettingsStore } from "@/stores/settings-store";
import {
  getWeekStartsOnLabel,
  normalizeWeekStartsOn,
} from "@/lib/utils/week-config";
import { cn } from "@/lib/utils/cn";

const SETTINGS_LINKS = [
  {
    href: "/settings/account",
    label: "Account",
    description: "Username and workspace name",
    icon: User,
  },
  {
    href: "/settings/appearance",
    label: "Appearance",
    description: "Zen presets, theme, and calendar",
    icon: Palette,
  },
  {
    href: "/settings/ai",
    label: "AI Configuration",
    description: "Provider, model, and API key",
    icon: Bot,
  },
  {
    href: "/settings/app",
    label: "App",
    description: "Install, offline use, and updates",
    icon: Smartphone,
  },
  {
    href: "/settings/data",
    label: "Data & Privacy",
    description: "Export, import, and reset",
    icon: Database,
  },
  {
    href: "/settings/about",
    label: "About",
    description: "Version, credits, and copyright",
    icon: Info,
  },
] as const;

export default function SettingsPage() {
  const taskCount = useLiveQuery(() => db.tasks.count());
  const settings = useLiveQuery(() => db.settings.get("default"));
  const zenPreset = useSettingsStore((s) => s.zenPreset);
  const preset = ZEN_PRESETS[zenPreset];
  const weekStartsOn = normalizeWeekStartsOn(settings?.weekStartsOn);
  const username = settings?.profile?.username;
  const workspaceName = settings?.profile?.workspaceName;

  return (
    <div className="mx-auto flex h-full min-h-0 w-full max-w-2xl flex-col">
      <MobilePageHeader
        title="Settings"
        subtitle="Your app, your rules"
        className="px-4 sm:px-6 lg:px-8"
      />

      <SettingsScrollArea>
      <div className="space-y-6 p-4 sm:p-6 lg:p-8">
        <Card className="rounded-2xl border-border/80 bg-card/60">
          <CardContent className="flex items-start justify-between gap-4 p-5">
            <div className="min-w-0 space-y-1">
              <p className="text-sm font-medium text-foreground">
                Local storage
              </p>
              <p className="text-xs leading-relaxed text-muted-foreground">
                {username ? `${username} · ` : ""}
                {workspaceName ?? "My Workspace"} · {taskCount ?? 0} tasks ·{" "}
                {preset.name} · Week starts {getWeekStartsOnLabel(weekStartsOn)}
              </p>
              <p className="text-[11px] text-muted-foreground/80">
                100% on-device — nothing leaves your browser
              </p>
            </div>
            <div
              className="mt-1 flex shrink-0 items-center gap-1.5"
              aria-label="Data stored locally"
            >
              <span className="h-2 w-2 rounded-full bg-planned" />
              <span className="text-[10px] font-medium uppercase tracking-wide text-planned">
                Local
              </span>
            </div>
          </CardContent>
        </Card>

        <div>
          <p className="mb-3 px-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Preferences
          </p>
          <div className="space-y-2">
            {SETTINGS_LINKS.map(({ href, label, description, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  "block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                )}
              >
                <Card className="rounded-2xl border-border/60 transition-colors hover:border-border hover:bg-muted/20">
                  <CardContent className="flex items-center gap-4 p-4 sm:p-5">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/15">
                      <Icon
                        className="h-5 w-5 text-accent"
                        strokeWidth={1.5}
                        aria-hidden
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground">
                        {label}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {description}
                      </p>
                    </div>
                    <ChevronRight
                      className="h-4 w-4 shrink-0 text-muted-foreground"
                      aria-hidden
                    />
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </div>
      </SettingsScrollArea>
    </div>
  );
}