"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import {
  LayoutGrid,
  BarChart3,
  MessageCircle,
  Settings,
  Tag,
  Search,
} from "lucide-react";
import { HesiaLogo } from "@/components/brand/hesia-logo";
import { cn } from "@/lib/utils/cn";
import { db } from "@/lib/db/schema";
import { useSettingsStore } from "@/stores/settings-store";
import { useCommandPaletteStore } from "@/stores/command-palette-store";
import { useModKeyLabel } from "@/lib/hooks/use-mod-key-label";
import { ZEN_PRESETS } from "@/lib/theme/presets";

const NAV_ITEMS = [
  { href: "/board", label: "Board", icon: LayoutGrid },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/chat", label: "Companion", icon: MessageCircle },
  { href: "/tags", label: "Tags & Categories", icon: Tag },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;

export function Sidebar() {
  const pathname = usePathname();
  const modKey = useModKeyLabel();
  const openPalette = useCommandPaletteStore((s) => s.openPalette);
  const zenPreset = useSettingsStore((s) => s.zenPreset);
  const preset = ZEN_PRESETS[zenPreset];
  const settings = useLiveQuery(() => db.settings.get("default"));
  const workspaceName = settings?.profile?.workspaceName ?? "Hesia";
  const username = settings?.profile?.username;

  return (
    <aside className="hidden lg:flex lg:w-60 lg:flex-col lg:border-r lg:border-border lg:bg-card/30 lg:backdrop-blur-md">
      <div className="flex h-16 items-center gap-3 px-6">
        <HesiaLogo size={36} className="shrink-0 rounded-xl" />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">
            {workspaceName}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {username ? `Hi, ${username}` : preset.name}
          </p>
        </div>
      </div>

      <div className="px-3 pt-2">
        <button
          type="button"
          onClick={openPalette}
          className="flex w-full items-center gap-3 rounded-2xl border border-border/50 bg-muted/20 px-4 py-2.5 text-sm text-muted-foreground transition-colors hover:border-border hover:bg-muted/40 hover:text-foreground"
        >
          <Search className="h-4 w-4 shrink-0" strokeWidth={1.5} />
          <span className="flex-1 text-left">Search…</span>
          <kbd className="rounded-md border border-border/60 bg-background/50 px-1.5 py-0.5 text-[10px] font-medium">
            {modKey}K
          </kbd>
        </button>
      </div>

      <nav className="flex flex-1 flex-col gap-1 px-3 py-4">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-all duration-200",
                active
                  ? "bg-accent/15 text-accent"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4" strokeWidth={1.5} />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border p-4">
        <p className="text-[11px] text-muted-foreground/70">Local only.</p>
      </div>
    </aside>
  );
}