import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { useBoardStore } from "@/stores/board-store";
import { useSettingsStore } from "@/stores/settings-store";
import { useChatStore } from "@/stores/chat-store";
import { useUIStore } from "@/stores/ui-store";
import { useCommandPaletteStore } from "@/stores/command-palette-store";
import type { CommandItem } from "./command-types";

export function executeCommand(
  item: CommandItem,
  router: AppRouterInstance,
): void {
  const board = useBoardStore.getState();
  const settings = useSettingsStore.getState();

  switch (item.type) {
    case "page":
      if (item.href) router.push(item.href);
      break;

    case "task":
      board.clearFilters();
      if (item.boardDate) board.setSelectedBoardDate(item.boardDate);
      if (item.taskId) board.setSelectedTaskId(item.taskId);
      router.push("/board");
      break;

    case "board-day":
      board.clearFilters();
      if (item.boardDate) board.setSelectedBoardDate(item.boardDate);
      board.setSelectedTaskId(null);
      router.push("/board");
      break;

    case "tag":
      board.clearFilters();
      if (item.tagName) {
        board.toggleTag(item.tagName);
      }
      router.push("/board");
      break;

    case "category":
      board.clearFilters();
      if (item.categoryName) {
        board.setSelectedCategory(item.categoryName);
      }
      router.push("/board");
      break;

    case "report-week":
      if (item.weekStart) {
        settings.setLastSelectedWeek(item.weekStart);
      }
      router.push("/reports");
      break;

    case "chat-session":
      if (item.chatSessionId) {
        useChatStore.getState().setActiveSessionId(item.chatSessionId);
      }
      useUIStore.getState().setPendingChatScrollToTop(true);
      router.push("/chat");
      break;

    case "chat-message":
      if (item.chatSessionId) {
        useChatStore.getState().setActiveSessionId(item.chatSessionId);
      }
      if (item.chatMessageId) {
        useUIStore.getState().setPendingChatMessageId(item.chatMessageId);
      }
      router.push("/chat");
      break;
  }

  useCommandPaletteStore.getState().closePalette();
}