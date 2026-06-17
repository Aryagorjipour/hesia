"use client";

import { Sidebar } from "./sidebar";
import { BottomNav } from "./bottom-nav";
import { OfflineBanner } from "@/components/pwa/offline-banner";
import { PwaUpdateBanner } from "@/components/pwa/pwa-update-banner";
import { InstallPrompt } from "@/components/pwa/install-prompt";
import { CommandPalette } from "@/components/command-palette/command-palette";
import { MobileSearchFab } from "./mobile-search-fab";
import { useReflectionReminder } from "@/lib/hooks/use-reflection-reminder";
import { useGlobalShortcuts } from "@/lib/hooks/use-global-shortcuts";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  useReflectionReminder();
  useGlobalShortcuts();

  return (
    <div className="flex h-dvh min-h-0 bg-background">
      <Sidebar />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <PwaUpdateBanner />
        <OfflineBanner />
        <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden overflow-hidden pt-safe lg:overflow-y-auto">
          {children}
        </main>
        <BottomNav />
        <InstallPrompt />
      </div>
      <CommandPalette />
      <MobileSearchFab />
    </div>
  );
}