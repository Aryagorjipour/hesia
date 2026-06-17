"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, CheckCircle2, Info, X, AlertTriangle } from "lucide-react";
import { useToastStore, type Toast, type ToastVariant } from "@/stores/toast-store";
import { cn } from "@/lib/utils/cn";

const VARIANT_STYLES: Record<
  ToastVariant,
  { icon: typeof Info; className: string; iconClassName: string }
> = {
  default: {
    icon: Info,
    className: "border-border/80 bg-card/95",
    iconClassName: "text-muted-foreground",
  },
  success: {
    icon: CheckCircle2,
    className: "border-emerald-500/25 bg-card/95",
    iconClassName: "text-emerald-400",
  },
  error: {
    icon: AlertCircle,
    className: "border-red-500/25 bg-card/95",
    iconClassName: "text-red-400",
  },
  info: {
    icon: Info,
    className: "border-accent/30 bg-card/95",
    iconClassName: "text-accent",
  },
  warning: {
    icon: AlertTriangle,
    className: "border-amber-500/25 bg-card/95",
    iconClassName: "text-amber-400",
  },
};

function ToastItem({ toast }: { toast: Toast }) {
  const dismiss = useToastStore((s) => s.dismiss);
  const { icon: Icon, className, iconClassName } = VARIANT_STYLES[toast.variant];

  useEffect(() => {
    const timer = window.setTimeout(() => dismiss(toast.id), toast.duration);
    return () => window.clearTimeout(timer);
  }, [dismiss, toast.duration, toast.id]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.96 }}
      transition={{ duration: 0.2 }}
      role="status"
      aria-live="polite"
      className={cn(
        "pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl border p-4 shadow-lg backdrop-blur-md",
        className,
      )}
    >
      <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", iconClassName)} aria-hidden />
      <div className="min-w-0 flex-1 space-y-1">
        {toast.title && (
          <p className="text-sm font-medium leading-none text-foreground">
            {toast.title}
          </p>
        )}
        <p className="text-sm text-muted-foreground">{toast.description}</p>
      </div>
      <button
        type="button"
        onClick={() => dismiss(toast.id)}
        className="shrink-0 rounded-lg p-1 text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
        aria-label="Dismiss notification"
      >
        <X className="h-4 w-4" />
      </button>
    </motion.div>
  );
}

export function ToastViewport() {
  const toasts = useToastStore((s) => s.toasts);

  return (
    <div
      aria-label="Notifications"
      className="pointer-events-none fixed inset-x-0 bottom-[calc(5rem+env(safe-area-inset-bottom,0px))] z-[100] flex flex-col items-center gap-2 px-4 sm:inset-x-auto sm:bottom-6 sm:right-6 sm:items-end sm:px-0 lg:bottom-6"
    >
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} />
        ))}
      </AnimatePresence>
    </div>
  );
}