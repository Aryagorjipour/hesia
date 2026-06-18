"use client";

import { ThemeProvider } from "./theme-provider";
import { DbProvider } from "./db-provider";
import { LocaleProvider } from "./locale-provider";
import { ToastProvider } from "./toast-provider";
import { DesktopProvider } from "./desktop-provider";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <DbProvider>
      <LocaleProvider>
        <ThemeProvider>
          <ToastProvider>
            <DesktopProvider>{children}</DesktopProvider>
          </ToastProvider>
        </ThemeProvider>
      </LocaleProvider>
    </DbProvider>
  );
}