"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw, WifiOff } from "lucide-react";
import { OFFLINE_CAPABLE_PATHS } from "@/lib/pwa/offline-routes";
import {
  collectSwDiagnostics,
  type SwDiagnosticsSnapshot,
} from "@/lib/pwa/sw-diagnostics";
import { Button } from "@/components/ui/button";

export function OfflineDiagnosticsPanel() {
  const [snapshot, setSnapshot] = useState<SwDiagnosticsSnapshot | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setSnapshot(await collectSwDiagnostics(OFFLINE_CAPABLE_PATHS));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    collectSwDiagnostics(OFFLINE_CAPABLE_PATHS).then((data) => {
      if (!cancelled) setSnapshot(data);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!snapshot) {
    return (
      <div className="rounded-2xl border border-border/60 bg-card/40 p-4 text-sm text-muted-foreground">
        Loading diagnostics…
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card/50 p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted/40">
            <WifiOff className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">
              Offline diagnostics
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Service worker state and cache buckets for debugging cold-start
              offline loads.
            </p>
          </div>
        </div>
        <Button
          size="sm"
          variant="secondary"
          className="h-8 shrink-0 gap-1.5 text-xs"
          onClick={() => void refresh()}
          disabled={loading}
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <dl className="mt-4 grid gap-2 text-xs sm:grid-cols-2">
        <DiagRow label="SW supported" value={snapshot.supported ? "Yes" : "No"} />
        <DiagRow label="Controller" value={snapshot.controllerState} />
        <DiagRow label="Scope" value={snapshot.registrationScope ?? "—"} />
        <DiagRow label="Base path" value={snapshot.basePath} />
        <DiagRow
          label="Waiting worker"
          value={snapshot.waitingWorker ? "Yes" : "No"}
        />
        <DiagRow
          label="Precached shells"
          value={String(snapshot.precacheShellCount)}
        />
        <DiagRow
          label="Cache buckets"
          value={String(snapshot.caches.length)}
        />
        <DiagRow label="Checked at" value={snapshot.lastCheckedAt} />
      </dl>

      {snapshot.caches.length > 0 && (
        <div className="mt-4">
          <p className="text-xs font-medium text-foreground">Cache contents</p>
          <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto rounded-lg border border-border/60 bg-background/40 p-2">
            {snapshot.caches.map((c) => (
              <li
                key={c.name}
                className="flex justify-between gap-2 font-mono text-[10px] text-muted-foreground"
              >
                <span className="truncate">{c.name}</span>
                <span className="shrink-0">{c.entryCount} entries</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="mt-3 text-[10px] text-muted-foreground">
        Offline routes: {snapshot.offlineCapableRoutes.join(", ")}
      </p>
    </div>
  );
}

function DiagRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2 rounded-lg bg-muted/20 px-2.5 py-1.5">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="truncate font-mono text-foreground">{value}</dd>
    </div>
  );
}