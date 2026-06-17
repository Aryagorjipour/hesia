import { create } from "zustand";
import { persist } from "zustand/middleware";

interface ChatUIState {
  activeSessionId: string | null;
  setActiveSessionId: (id: string | null) => void;
}

export const useChatStore = create<ChatUIState>()(
  persist(
    (set) => ({
      activeSessionId: null,
      setActiveSessionId: (id) => set({ activeSessionId: id }),
    }),
    {
      name: "hesia-chat-ui",
      partialize: (state) => ({
        activeSessionId: state.activeSessionId,
      }),
    },
  ),
);