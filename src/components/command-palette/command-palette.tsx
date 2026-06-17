"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import {
  BarChart3,
  Calendar,
  FolderOpen,
  LayoutGrid,
  MessageCircle,
  Search,
  Settings,
  Smartphone,
  Tag,
  User,
  Bot,
  Database,
  Info,
  Palette,
  ListTodo,
  ArrowLeftRight,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { db } from "@/lib/db/schema";
import { isAiConfigured } from "@/lib/ai/is-ai-configured";
import { useCommandPaletteStore } from "@/stores/command-palette-store";
import { useWeekStartsOn } from "@/lib/hooks/use-week-starts-on";
import { useModKeyLabel } from "@/lib/hooks/use-mod-key-label";
import {
  buildCommandIndex,
  groupCommandItems,
  rankCommandItems,
} from "@/lib/search/command-index";
import { executeCommand } from "@/lib/search/execute-command";
import {
  COMMAND_GROUP_LABELS,
  type CommandItem,
  type CommandItemType,
} from "@/lib/search/command-types";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils/cn";

const PAGE_ICONS: Record<string, LucideIcon> = {
  "page-board": LayoutGrid,
  "page-reports": BarChart3,
  "page-chat": MessageCircle,
  "page-tags": Tag,
  "page-settings": Settings,
  "page-settings-account": User,
  "page-settings-appearance": Palette,
  "page-settings-ai": Bot,
  "page-settings-app": Smartphone,
  "page-settings-data": Database,
  "page-settings-about": Info,
  "page-settings-sync-send": ArrowLeftRight,
  "page-settings-sync-receive": ArrowLeftRight,
};

const TYPE_ICONS: Record<CommandItemType, LucideIcon> = {
  page: LayoutGrid,
  "board-day": Calendar,
  task: ListTodo,
  tag: Tag,
  category: FolderOpen,
  "report-week": BarChart3,
  "chat-session": MessageCircle,
  "chat-message": MessageCircle,
};

function CommandIcon({ item }: { item: CommandItem }) {
  const Icon =
    item.type === "page"
      ? (PAGE_ICONS[item.id] ?? LayoutGrid)
      : TYPE_ICONS[item.type];
  return <Icon className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={1.5} />;
}

export function CommandPalette() {
  const router = useRouter();
  const pathname = usePathname();
  const modKey = useModKeyLabel();
  const weekStartsOn = useWeekStartsOn();
  const onChatPage = pathname.startsWith("/chat");

  const open = useCommandPaletteStore((s) => s.open);
  const query = useCommandPaletteStore((s) => s.query);
  const activeIndex = useCommandPaletteStore((s) => s.activeIndex);
  const closePalette = useCommandPaletteStore((s) => s.closePalette);
  const setQuery = useCommandPaletteStore((s) => s.setQuery);
  const setActiveIndex = useCommandPaletteStore((s) => s.setActiveIndex);

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [debouncedQuery, setDebouncedQuery] = useState("");

  const tasks = useLiveQuery(() => db.tasks.toArray());
  const tags = useLiveQuery(() => db.tags.toArray());
  const categories = useLiveQuery(() => db.categories.toArray());
  const weeklyReports = useLiveQuery(() => db.weeklyReports.toArray());
  const settings = useLiveQuery(() => db.settings.get("default"));
  const includeChat =
    onChatPage && isAiConfigured(settings?.aiConfig);

  const chatSessions = useLiveQuery(
    () => (includeChat ? db.chatSessions.toArray() : []),
    [includeChat],
  );
  const chatMessages = useLiveQuery(
    () => (includeChat ? db.chatMessages.toArray() : []),
    [includeChat],
  );

  const loading =
    tasks === undefined ||
    tags === undefined ||
    categories === undefined ||
    weeklyReports === undefined ||
    (includeChat &&
      (chatSessions === undefined || chatMessages === undefined));

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 100);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    if (open) {
      const t = setTimeout(() => inputRef.current?.focus(), 0);
      return () => clearTimeout(t);
    }
  }, [open]);

  const index = useMemo(() => {
    if (loading) return [];
    return buildCommandIndex({
      tasks: tasks ?? [],
      tags: tags ?? [],
      categories: categories ?? [],
      weeklyReports: weeklyReports ?? [],
      weekStartsOn,
      includeChat,
      chatSessions: chatSessions ?? [],
      chatMessages: chatMessages ?? [],
    });
  }, [
    loading,
    tasks,
    tags,
    categories,
    weeklyReports,
    weekStartsOn,
    includeChat,
    chatSessions,
    chatMessages,
  ]);

  const results = useMemo(
    () => rankCommandItems(debouncedQuery, index),
    [debouncedQuery, index],
  );

  const groups = useMemo(() => groupCommandItems(results), [results]);

  const flatResults = results;

  const handleSelect = useCallback(
    (item: CommandItem) => {
      executeCommand(item, router);
    },
    [router],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex(
          flatResults.length === 0
            ? 0
            : Math.min(activeIndex + 1, flatResults.length - 1),
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex(Math.max(activeIndex - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        const item = flatResults[activeIndex];
        if (item) handleSelect(item);
      } else if (e.key === "Escape") {
        e.preventDefault();
        closePalette();
      }
    },
    [
      activeIndex,
      flatResults,
      setActiveIndex,
      handleSelect,
      closePalette,
    ],
  );

  useEffect(() => {
    const el = listRef.current?.querySelector(
      `[data-command-index="${activeIndex}"]`,
    );
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  let runningIndex = 0;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && closePalette()}>
      <DialogContent
        showClose={false}
        className="gap-0 overflow-hidden p-0 sm:max-w-xl z-[110]"
        onKeyDown={handleKeyDown}
      >
        <DialogTitle className="sr-only">Search</DialogTitle>

        <div className="flex items-center gap-3 border-b border-border/60 px-4 py-3">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={
              includeChat
                ? "Search pages, tasks, chats…"
                : "Search pages, tasks, days…"
            }
            className="h-9 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
          />
          <kbd className="hidden shrink-0 rounded-lg border border-border/60 bg-muted/40 px-2 py-0.5 text-[10px] font-medium text-muted-foreground sm:inline">
            {modKey}K
          </kbd>
        </div>

        <div
          ref={listRef}
          className="max-h-[min(60vh,420px)] overflow-y-auto p-2"
        >
          {loading ? (
            <p className="px-3 py-8 text-center text-sm text-muted-foreground">
              Loading…
            </p>
          ) : flatResults.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-muted-foreground">
              No results for &ldquo;{debouncedQuery}&rdquo;
            </p>
          ) : (
            groups.map((group) => (
              <div key={group.type} className="mb-2 last:mb-0">
                <p className="px-3 py-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/80">
                  {COMMAND_GROUP_LABELS[group.type]}
                </p>
                <ul>
                  {group.items.map((item) => {
                    const idx = runningIndex++;
                    return (
                      <li key={item.id}>
                        <button
                          type="button"
                          data-command-index={idx}
                          className={cn(
                            "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors",
                            idx === activeIndex
                              ? "bg-accent/15 text-foreground"
                              : "text-foreground hover:bg-muted/40",
                          )}
                          onMouseEnter={() => setActiveIndex(idx)}
                          onClick={() => handleSelect(item)}
                        >
                          <CommandIcon item={item} />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">
                              {item.label}
                            </p>
                            {item.description && (
                              <p className="truncate text-xs text-muted-foreground">
                                {item.description}
                              </p>
                            )}
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))
          )}
        </div>

        <div className="flex items-center justify-between border-t border-border/60 px-4 py-2 text-[10px] text-muted-foreground">
          <span>
            <kbd className="rounded border border-border/60 bg-muted/30 px-1">
              ↑↓
            </kbd>{" "}
            navigate
          </span>
          <span>
            <kbd className="rounded border border-border/60 bg-muted/30 px-1">
              ↵
            </kbd>{" "}
            open
          </span>
          <span>
            <kbd className="rounded border border-border/60 bg-muted/30 px-1">
              esc
            </kbd>{" "}
            close
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}