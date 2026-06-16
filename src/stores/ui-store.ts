import { create } from "zustand";
import type { TaskStatus } from "@/types/task";
import { todayISO } from "@/lib/utils/board-dates";

interface UIState {
  quickCaptureOpen: boolean;
  quickCaptureStatus: TaskStatus;
  quickCaptureBoardDate: string;
  setQuickCaptureOpen: (open: boolean) => void;
  openQuickCapture: (status?: TaskStatus, boardDate?: string) => void;
}

export const useUIStore = create<UIState>((set) => ({
  quickCaptureOpen: false,
  quickCaptureStatus: "inbox",
  quickCaptureBoardDate: "",
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