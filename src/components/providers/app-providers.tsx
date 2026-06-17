"use client";

import { ThemeProvider } from "./theme-provider";
import { DbProvider } from "./db-provider";
import { ToastProvider } from "./toast-provider";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <DbProvider>
      <ThemeProvider>
        <ToastProvider>{children}</ToastProvider>
      </ThemeProvider>
    </DbProvider>
  );
}