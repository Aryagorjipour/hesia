"use client";

import { useMemo, useCallback, useRef } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Plus, LayoutGrid, List } from "lucide-react";
import { MobilePageHeader } from "@/components/layout/mobile-page-header";
import { db } from "@/lib/db/schema";
import { useBoardStore } from "@/stores/board-store";
import { useUIStore } from "@/stores/ui-store";
import { COLUMN_LABELS, DEFAULT_COLUMNS, type TaskStatus } from "@/types/task";
import {
  getBoardPermissions,
  shouldShowCarryForwardBar,
} from "@/lib/utils/board-dates";
import { filterTasks, sortTasksByOrder } from "./lib/filter-tasks";
import {
  filterTasksForBoardDay,
  countCarryForwardCandidates,
} from "./lib/board-day-filter";
import { KanbanBoard } from "./kanban-board";
import { TaskListView } from "./task-list-view";
import { BoardFilters } from "./board-filters";
import { QuickLogDialog } from "./quick-log-dialog";
import { TaskDetailSheet } from "./task-detail-sheet";
import { DaySelector } from "./day-selector";
import { RollOverBar } from "./roll-over-bar";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { useKeyboardShortcuts } from "@/lib/hooks/use-keyboard-shortcuts";

export function BoardView() {
  const searchInputRef = useRef<HTMLInputElement>(null);
  const allTasks = useLiveQuery(() => db.tasks.toArray());
  const allTags = useLiveQuery(() => db.tags.toArray()) ?? [];
  const settings = useLiveQuery(() => db.settings.get("default"));

  const {
    viewMode,
    setViewMode,
    searchQuery,
    selectedTags,
    selectedCategory,
    plannedFilter,
    statusFilter,
    dateFrom,
    dateTo,
    selectedTaskId,
    selectedBoardDate,
    dismissedInboxBannerKeys,
    setSelectedBoardDate,
    dismissInboxBanner,
    setSelectedTaskId,
  } = useBoardStore();

  const quickCaptureOpen = useUIStore((s) => s.quickCaptureOpen);
  const quickCaptureStatus = useUIStore((s) => s.quickCaptureStatus);
  const quickCaptureBoardDate = useUIStore((s) => s.quickCaptureBoardDate);
  const setQuickCaptureOpen = useUIStore((s) => s.setQuickCaptureOpen);
  const openQuickCapture = useUIStore((s) => s.openQuickCapture);

  const permissions = useMemo(
    () => getBoardPermissions(selectedBoardDate),
    [selectedBoardDate],
  );

  const columnLabels = useMemo(() => {
    const custom = settings?.columnNames;
    return DEFAULT_COLUMNS.reduce(
      (acc, status) => {
        acc[status] = custom?.[status] ?? COLUMN_LABELS[status];
        return acc;
      },
      {} as Record<TaskStatus, string>,
    );
  }, [settings?.columnNames]);

  const filteredTasks = useMemo(() => {
    if (!allTasks) return [];
    const searched = filterTasks(allTasks, {
      searchQuery,
      selectedTags,
      selectedCategory,
      plannedFilter,
      statusFilter,
      dateFrom,
      dateTo,
    });
    return filterTasksForBoardDay(searched, selectedBoardDate);
  }, [
    allTasks,
    searchQuery,
    selectedTags,
    selectedCategory,
    plannedFilter,
    statusFilter,
    dateFrom,
    dateTo,
    selectedBoardDate,
  ]);

  const carryCount = useMemo(
    () => countCarryForwardCandidates(allTasks ?? [], selectedBoardDate),
    [allTasks, selectedBoardDate],
  );

  const listTasks = useMemo(
    () => sortTasksByOrder(filteredTasks),
    [filteredTasks],
  );

  const canQuickLog = permissions.canAdd("inbox");

  const handleAddToColumn = useCallback(
    (status: TaskStatus) => {
      if (!permissions.canAdd(status)) return;
      openQuickCapture(status, selectedBoardDate);
    },
    [permissions, openQuickCapture, selectedBoardDate],
  );

  const handleTaskClick = useCallback(
    (taskId: string) => setSelectedTaskId(taskId),
    [setSelectedTaskId],
  );

  const handleCloseDetail = useCallback(
    () => setSelectedTaskId(null),
    [setSelectedTaskId],
  );

  useKeyboardShortcuts({
    onQuickCapture: () => {
      if (canQuickLog) openQuickCapture("inbox", selectedBoardDate);
    },
    onSearch: () => searchInputRef.current?.focus(),
    onEscape: () => {
      if (selectedTaskId) setSelectedTaskId(null);
      else if (quickCaptureOpen) setQuickCaptureOpen(false);
    },
  });

  const isEmpty = allTasks && allTasks.length === 0;
  const isLoading = allTasks === undefined;

  const boardTitle = settings?.profile?.workspaceName ?? "Board";
  const presetSubtitle =
    settings?.zenPreset &&
    settings.presetWorkspaceConfigs?.[settings.zenPreset]?.boardSubtitle;
  const boardSubtitle =
    presetSubtitle ??
    (settings?.profile?.username
      ? `Hi ${settings.profile.username} — one board per day`
      : "One board per day");

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden">
      <MobilePageHeader
        title={boardTitle}
        subtitle={boardSubtitle}
        actions={
          <>
            <div className="flex items-center gap-1 rounded-2xl bg-muted/30 p-1 lg:hidden">
              <Button
                variant={viewMode === "board" ? "default" : "ghost"}
                size="icon"
                onClick={() => setViewMode("board")}
                className="h-11 w-11 rounded-xl"
                aria-label="Board view"
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "default" : "ghost"}
                size="icon"
                onClick={() => setViewMode("list")}
                className="h-11 w-11 rounded-xl"
                aria-label="List view"
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
            {canQuickLog && (
              <Button
                size="sm"
                className="hidden h-11 lg:flex"
                onClick={() => openQuickCapture("inbox", selectedBoardDate)}
              >
                <Plus className="h-4 w-4" />
                Quick log
                <kbd className="ml-2 hidden rounded bg-accent-foreground/20 px-1.5 py-0.5 text-xs xl:inline">
                  N
                </kbd>
              </Button>
            )}
          </>
        }
      />

      <DaySelector
        selectedBoardDate={selectedBoardDate}
        onSelect={setSelectedBoardDate}
        permissions={permissions}
        dismissedInboxBannerKeys={dismissedInboxBannerKeys}
        onDismissInboxBanner={dismissInboxBanner}
      />

      {permissions.canCarryForward &&
        shouldShowCarryForwardBar(selectedBoardDate) && (
          <RollOverBar boardDate={selectedBoardDate} count={carryCount} />
        )}

      {!isEmpty && <BoardFilters searchInputRef={searchInputRef} />}

      {isLoading ? (
        <div className="flex flex-1 items-center justify-center">
          <div className="h-8 w-8 animate-pulse rounded-full bg-accent/30" />
        </div>
      ) : isEmpty ? (
        <div className="flex min-h-0 flex-1 items-center justify-center overflow-x-hidden px-4 py-6 sm:p-8">
          <EmptyState
            icon={LayoutGrid}
            title="Nothing here yet"
            description="Quick-log a win — past tense goes to Done, plans to To Do."
            className="w-full max-w-sm"
            action={
              <Button
                className="w-full max-w-xs sm:w-auto"
                onClick={() => openQuickCapture("inbox", selectedBoardDate)}
              >
                <Plus className="h-4 w-4" />
                <span className="sm:hidden">Quick log</span>
                <span className="hidden sm:inline">Quick log your first win</span>
              </Button>
            }
          />
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {viewMode === "board" ? (
            <KanbanBoard
              tasks={filteredTasks}
              tags={allTags}
              columnLabels={columnLabels}
              boardDate={selectedBoardDate}
              permissions={permissions}
              onTaskClick={handleTaskClick}
              onAddToColumn={handleAddToColumn}
            />
          ) : (
            <TaskListView
              tasks={listTasks}
              tags={allTags}
              onTaskClick={handleTaskClick}
            />
          )}
        </div>
      )}

      {canQuickLog && !isEmpty && (
        <Button
          size="icon"
          className="fixed bottom-24 end-4 z-40 h-14 w-14 rounded-full shadow-lg sm:end-6 lg:bottom-8"
          onClick={() => openQuickCapture("inbox", selectedBoardDate)}
          aria-label="Quick log"
        >
          <Plus className="h-6 w-6" />
        </Button>
      )}

      <QuickLogDialog
        open={quickCaptureOpen}
        onOpenChange={setQuickCaptureOpen}
        initialStatus={quickCaptureStatus}
        boardDate={quickCaptureBoardDate || selectedBoardDate}
        permissions={getBoardPermissions(
          quickCaptureBoardDate || selectedBoardDate,
        )}
      />

      <TaskDetailSheet
        taskId={selectedTaskId}
        boardDate={selectedBoardDate}
        permissions={permissions}
        onClose={handleCloseDetail}
      />
    </div>
  );
}