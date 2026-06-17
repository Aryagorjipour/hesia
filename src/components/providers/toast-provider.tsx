"use client";

import { ToastViewport } from "@/components/ui/toast";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

export function ToastProvider({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <ToastViewport />
      <ConfirmDialog />
    </>
  );
}