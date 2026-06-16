"use client";

import { Sidebar } from "./sidebar";
import { BottomNav } from "./bottom-nav";
import { OfflineBanner } from "@/components/pwa/offline-banner";
import { PwaUpdateBanner } from "@/components/pwa/pwa-update-banner";
import { InstallPrompt } from "@/components/pwa/install-prompt";
import { useReflectionReminder } from "@/lib/hooks/use-reflection-reminder";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  useReflectionReminder();

  return (
    <div className="flex h-dvh min-h-0 bg-background">
      <Sidebar />
      <div className="flex min-h-0 flex-1 flex-col">
        <PwaUpdateBanner />
        <OfflineBanner />
        <main className="flex min-h-0 flex-1 flex-col overflow-y-auto pb-16 pt-safe lg:pb-0">
          {children}
        </main>
        <BottomNav />
        <InstallPrompt />
      </div>
    </div>
  );
}