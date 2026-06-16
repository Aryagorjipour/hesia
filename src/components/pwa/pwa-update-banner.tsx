"use client";

import { RefreshCw } from "lucide-react";
import { useSwUpdate } from "@/lib/hooks/use-sw-update";
import { Button } from "@/components/ui/button";

export function PwaUpdateBanner() {
  const { updateAvailable, applyUpdate } = useSwUpdate();

  if (!updateAvailable) return null;

  return (
    <div className="flex shrink-0 items-center justify-between gap-3 border-b border-accent/20 bg-accent/10 px-3 py-2 sm:px-4">
      <p className="text-xs text-foreground">
        A new version of Hesia is ready.
      </p>
      <Button
        size="sm"
        variant="secondary"
        className="h-8 shrink-0 gap-1.5 text-xs"
        onClick={applyUpdate}
      >
        <RefreshCw className="h-3.5 w-3.5" />
        Reload
      </Button>
    </div>
  );
}