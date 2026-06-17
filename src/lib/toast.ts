import { useToastStore, type ToastVariant } from "@/stores/toast-store";

interface ToastOptions {
  title?: string;
  description: string;
  duration?: number;
}

function show(variant: ToastVariant, options: ToastOptions) {
  return useToastStore.getState().add({ ...options, variant });
}

export const toast = Object.assign(
  (options: ToastOptions & { variant?: ToastVariant }) =>
    show(options.variant ?? "default", options),
  {
    success: (options: ToastOptions) => show("success", options),
    error: (options: ToastOptions) => show("error", options),
    info: (options: ToastOptions) => show("info", options),
    warning: (options: ToastOptions) => show("warning", options),
    dismiss: (id: string) => useToastStore.getState().dismiss(id),
    clear: () => useToastStore.getState().clear(),
  },
);