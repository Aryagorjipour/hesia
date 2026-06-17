import { create } from "zustand";
import type { TaskStatus } from "@/types/task";
import { todayISO } from "@/lib/utils/board-dates";

interface UIState {
  quickCaptureOpen: boolean;
  quickCaptureStatus: TaskStatus;
  quickCaptureBoardDate: string;
  pendingChatMessageId: string | null;
  pendingChatDraft: string | null;
  pendingChatScrollToTop: boolean;
  setQuickCaptureOpen: (open: boolean) => void;
  openQuickCapture: (status?: TaskStatus, boardDate?: string) => void;
  setPendingChatMessageId: (id: string | null) => void;
  setPendingChatDraft: (draft: string | null) => void;
  setPendingChatScrollToTop: (scroll: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  quickCaptureOpen: false,
  quickCaptureStatus: "inbox",
  quickCaptureBoardDate: "",
  pendingChatMessageId: null,
  pendingChatDraft: null,
  pendingChatScrollToTop: false,
  setPendingChatMessageId: (id) => set({ pendingChatMessageId: id }),
  setPendingChatDraft: (draft) => set({ pendingChatDraft: draft }),
  setPendingChatScrollToTop: (scroll) => set({ pendingChatScrollToTop: scroll }),
  setQuickCaptureOpen: (open) =>
    set({
      quickCaptureOpen: open,
      ...(!open
        ? {
            quickCaptureStatus: "inbox" as TaskStatus,
            quickCaptureBoardDate: "",
          }
        : {}),
    }),
  openQuickCapture: (status = "inbox", boardDate = todayISO()) =>
    set({
      quickCaptureOpen: true,
      quickCaptureStatus: status,
      quickCaptureBoardDate: boardDate,
    }),
}));