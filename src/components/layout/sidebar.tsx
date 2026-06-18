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
  ChevronLeft,
} from "lucide-react";
import { HesiaLogo } from "@/components/brand/hesia-logo";
import { cn } from "@/lib/utils/cn";
import { db } from "@/lib/db/schema";
import { useSettingsStore } from "@/stores/settings-store";
import { useCommandPaletteStore } from "@/stores/command-palette-store";
import { useModKeyLabel } from "@/lib/hooks/use-mod-key-label";
import { usePrefersReducedMotion } from "@/lib/hooks/use-prefers-reduced-motion";
import { ZEN_PRESETS } from "@/lib/theme/presets";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const NAV_ITEMS = [
  { href: "/board", label: "Board", icon: LayoutGrid },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/chat", label: "Companion", icon: MessageCircle },
  { href: "/tags", label: "Tags & Categories", icon: Tag },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;

const SIDEBAR_EASE = "cubic-bezier(0.22, 1, 0.36, 1)";

function SidebarTooltip({
  collapsed,
  label,
  children,
}: {
  collapsed: boolean;
  label: string;
  children: React.ReactNode;
}) {
  if (!collapsed) return <>{children}</>;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side="right" sideOffset={10}>
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const modKey = useModKeyLabel();
  const reducedMotion = usePrefersReducedMotion();
  const openPalette = useCommandPaletteStore((s) => s.openPalette);
  const collapsed = useSettingsStore((s) => s.sidebarCollapsed);
  const setSidebarCollapsed = useSettingsStore((s) => s.setSidebarCollapsed);
  const zenPreset = useSettingsStore((s) => s.zenPreset);
  const preset = ZEN_PRESETS[zenPreset];
  const settings = useLiveQuery(() => db.settings.get("default"));
  const workspaceName = settings?.profile?.workspaceName ?? "Hesia";
  const username = settings?.profile?.username;

  const motionMs = reducedMotion ? 0 : 300;
  const labelMotionMs = reducedMotion ? 0 : 220;

  return (
    <TooltipProvider delayDuration={reducedMotion ? 0 : 400}>
      <aside
        className={cn(
          "relative hidden shrink-0 flex-col overflow-hidden border-r border-border bg-card/30 backdrop-blur-md lg:flex",
          collapsed ? "w-[4.5rem]" : "w-60",
        )}
        style={{
          transition: reducedMotion
            ? undefined
            : `width ${motionMs}ms ${SIDEBAR_EASE}`,
        }}
        data-collapsed={collapsed ? "" : undefined}
      >
        <button
          type="button"
          onClick={() => setSidebarCollapsed(!collapsed)}
          className={cn(
            "absolute top-[4.25rem] z-20 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-sm transition-colors hover:bg-muted/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            collapsed ? "end-2" : "-end-3",
          )}
          style={{
            transition: reducedMotion
              ? undefined
              : `inset-inline-end ${motionMs}ms ${SIDEBAR_EASE}`,
          }}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <ChevronLeft
            className={cn(
              "h-3.5 w-3.5 transition-transform",
              collapsed && "rotate-180",
            )}
            style={{
              transition: reducedMotion
                ? undefined
                : `transform ${motionMs}ms ${SIDEBAR_EASE}`,
            }}
            aria-hidden
          />
        </button>

        <div
          className={cn(
            "flex h-16 shrink-0 items-center border-b border-border/50",
            collapsed ? "justify-center px-2" : "gap-3 px-5",
          )}
        >
          <SidebarTooltip collapsed={collapsed} label={workspaceName}>
            <span className="inline-flex shrink-0 rounded-xl">
              <HesiaLogo
                size={collapsed ? 32 : 36}
                className="rounded-xl"
              />
            </span>
          </SidebarTooltip>

          <div
            className={cn(
              "min-w-0 overflow-hidden",
              collapsed ? "w-0 opacity-0" : "flex-1 opacity-100",
            )}
            style={{
              transition: reducedMotion
                ? undefined
                : `opacity ${labelMotionMs}ms ${SIDEBAR_EASE}, width ${motionMs}ms ${SIDEBAR_EASE}`,
            }}
            aria-hidden={collapsed}
          >
            <p className="truncate text-sm font-medium text-foreground">
              {workspaceName}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {username ? `Hi, ${username}` : preset.name}
            </p>
          </div>
        </div>

        <div className={cn("px-2 pt-3", !collapsed && "px-3")}>
          <SidebarTooltip
            collapsed={collapsed}
            label={`Search (${modKey}K)`}
          >
            <button
              type="button"
              onClick={openPalette}
              className={cn(
                "flex w-full items-center rounded-2xl border border-border/50 bg-muted/20 text-sm text-muted-foreground transition-colors hover:border-border hover:bg-muted/40 hover:text-foreground",
                collapsed
                  ? "h-11 justify-center px-0"
                  : "gap-3 px-4 py-2.5",
              )}
            >
              <Search className="h-4 w-4 shrink-0" strokeWidth={1.5} />
              <span
                className={cn(
                  "overflow-hidden whitespace-nowrap text-left",
                  collapsed ? "w-0 opacity-0" : "flex-1 opacity-100",
                )}
                style={{
                  transition: reducedMotion
                    ? undefined
                    : `opacity ${labelMotionMs}ms ${SIDEBAR_EASE}, width ${labelMotionMs}ms ${SIDEBAR_EASE}`,
                }}
              >
                Search…
              </span>
              <kbd
                className={cn(
                  "overflow-hidden whitespace-nowrap rounded-md border border-border/60 bg-background/50 px-1.5 py-0.5 text-[10px] font-medium",
                  collapsed ? "w-0 opacity-0" : "opacity-100",
                )}
                style={{
                  transition: reducedMotion
                    ? undefined
                    : `opacity ${labelMotionMs}ms ${SIDEBAR_EASE}`,
                }}
              >
                {modKey}K
              </kbd>
            </button>
          </SidebarTooltip>
        </div>

        <nav
          className={cn(
            "flex flex-1 flex-col gap-1 py-4",
            collapsed ? "px-2" : "px-3",
          )}
        >
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = pathname.startsWith(href);
            const link = (
              <Link
                href={href}
                className={cn(
                  "flex items-center rounded-2xl text-sm font-medium transition-colors duration-200",
                  collapsed
                    ? "h-11 justify-center px-0"
                    : "gap-3 px-4 py-3",
                  active
                    ? "bg-accent/15 text-accent"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                )}
              >
                <Icon className="h-4 w-4 shrink-0" strokeWidth={1.5} />
                <span
                  className={cn(
                    "overflow-hidden whitespace-nowrap",
                    collapsed ? "w-0 opacity-0" : "opacity-100",
                  )}
                  style={{
                    transition: reducedMotion
                      ? undefined
                      : `opacity ${labelMotionMs}ms ${SIDEBAR_EASE}, width ${labelMotionMs}ms ${SIDEBAR_EASE}`,
                  }}
                >
                  {label}
                </span>
              </Link>
            );

            return (
              <SidebarTooltip key={href} collapsed={collapsed} label={label}>
                {link}
              </SidebarTooltip>
            );
          })}
        </nav>

        <div
          className={cn(
            "shrink-0 overflow-hidden border-t border-border transition-[opacity,padding,height,border-color]",
            collapsed
              ? "h-0 border-transparent p-0 opacity-0"
              : "p-4 opacity-100",
          )}
          style={{
            transition: reducedMotion
              ? undefined
              : `opacity ${labelMotionMs}ms ${SIDEBAR_EASE}, padding ${motionMs}ms ${SIDEBAR_EASE}, height ${motionMs}ms ${SIDEBAR_EASE}`,
          }}
          aria-hidden={collapsed}
        >
          <p className="text-[11px] text-muted-foreground/70">Local only.</p>
        </div>
      </aside>
    </TooltipProvider>
  );
}