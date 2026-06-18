"use client";

import { CheckCircle2 } from "lucide-react";

export function DesktopRelayBadge() {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-planned/30 bg-planned/10 px-3 py-2">
      <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-planned" />
      <p className="text-xs text-foreground">
        Email &amp; AI tools · Built-in · Always running
      </p>
    </div>
  );
}
