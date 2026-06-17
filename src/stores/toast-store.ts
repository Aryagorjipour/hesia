import { create } from "zustand";
import { v4 as uuidv4 } from "uuid";

export type ToastVariant = "default" | "success" | "error" | "info" | "warning";

export interface Toast {
  id: string;
  title?: string;
  description: string;
  variant: ToastVariant;
  duration: number;
}

interface ToastInput {
  title?: string;
  description: string;
  variant?: ToastVariant;
  duration?: number;
}

interface ToastState {
  toasts: Toast[];
  add: (toast: ToastInput) => string;
  dismiss: (id: string) => void;
  clear: () => void;
}

const DEFAULT_DURATION: Record<ToastVariant, number> = {
  default: 4000,
  success: 3500,
  info: 4000,
  warning: 5000,
  error: 6000,
};

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  add: (toast) => {
    const id = uuidv4();
    const variant = toast.variant ?? "default";
    const duration = toast.duration ?? DEFAULT_DURATION[variant];

    set((state) => ({
      toasts: [
        ...state.toasts,
        { id, title: toast.title, description: toast.description, variant, duration },
      ],
    }));

    return id;
  },
  dismiss: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),
  clear: () => set({ toasts: [] }),
}));