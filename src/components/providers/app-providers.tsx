"use client";

import { ThemeProvider } from "./theme-provider";
import { DbProvider } from "./db-provider";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <DbProvider>
      <ThemeProvider>{children}</ThemeProvider>
    </DbProvider>
  );
}