"use client";

import { Archive, Calendar, Lock, Sparkles, X } from "lucide-react";
import type { BoardPermissions } from "@/lib/utils/board-dates";
import {
  formatBoardDayLabel,
  getInboxSharedBannerKey,
  shouldShowInboxSharedBanner,
} from "@/lib/utils/board-dates";
import { cn } from "@/lib/utils/cn";

interface BoardDayBannerProps {
  boardDate: string;
  permissions: BoardPermissions;
  dismissedInboxBannerKeys: string[];
  onDismissInboxBanner: (key: string) => void;
}

export function BoardDayBanner({
  boardDate,
  permissions,
  dismissedInboxBannerKeys,
  onDismissInboxBanner,
}: BoardDayBannerProps) {
  const { mode } = permissions;
  const showInbox =
    shouldShowInboxSharedBanner(boardDate, dismissedInboxBannerKeys);
  const inboxKey = getInboxSharedBannerKey(boardDate);

  if (showInbox && inboxKey) {
    return (
      <div className="flex items-center gap-2 border-t border-border/40 bg-accent/5 px-4 py-1.5 text-[11px] text-muted-foreground sm:px-6 lg:px-8">
        <Calendar className="h-3 w-3 shrink-0 text-accent" />
        <span className="min-w-0 flex-1 leading-snug">
          <strong className="text-foreground">Today&apos;s board</strong> — Inbox
          is shared across all days
        </span>
        <button
          type="button"
          onClick={() => onDismissInboxBanner(inboxKey)}
          className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
          aria-label="Dismiss"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
    );
  }

  if (mode === "today") return null;

  const config = {
    future: {
      icon: Sparkles,
      text: `Planning ${formatBoardDayLabel(boardDate)} — To Do only`,
      className: "bg-accent/5",
    },
    recent_past: {
      icon: Calendar,
      text: `${formatBoardDayLabel(boardDate)} — carry incomplete forward`,
      className: "bg-muted/20",
    },
    archived_past: {
      icon: Lock,
      text: `${formatBoardDayLabel(boardDate)} — read only`,
      className: "bg-muted/15",
    },
  }[mode] ?? { icon: Archive, text: "", className: "" };

  const Icon = config.icon;
  if (!config.text) return null;

  return (
    <div
      className={cn(
        "flex items-center gap-2 border-t border-border/40 px-4 py-1.5 text-[11px] text-muted-foreground sm:px-6 lg:px-8",
        config.className,
      )}
    >
      <Icon className="h-3 w-3 shrink-0" />
      <span className="leading-snug">{config.text}</span>
    </div>
  );
}