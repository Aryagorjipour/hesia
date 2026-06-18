"use client";

import { useEffect } from "react";
import { isDesktop } from "@/lib/platform";
import { db } from "@/lib/db/schema";

export function DesktopProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (!isDesktop()) return;

    let unlisten: (() => void) | undefined;

    import("@tauri-apps/api/window").then(({ getCurrentWindow }) => {
      const win = getCurrentWindow();
      void win
        .onCloseRequested(async (event) => {
          const settings = await db.settings.get("default");
          if (settings?.desktopCloseToTray) {
            event.preventDefault();
            await win.hide();
          }
        })
        .then((fn) => {
          unlisten = fn;
        });
    });

    return () => {
      unlisten?.();
    };
  }, []);

  return <>{children}</>;
}
