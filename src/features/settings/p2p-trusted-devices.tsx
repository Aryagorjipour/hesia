"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { ShieldCheck, Trash2 } from "lucide-react";
import { db } from "@/lib/db/schema";
import { Button } from "@/components/ui/button";

export function P2pTrustedDevices() {
  const trusted = useLiveQuery(() => db.trustedSenders.toArray(), []);

  if (!trusted?.length) {
    return (
      <p className="text-xs text-muted-foreground">
        No trusted devices yet. Trust a phone on first sync to skip the password
        next time.
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {trusted.map((device) => (
        <li
          key={device.deviceId}
          className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-card/40 px-3 py-2.5"
        >
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-sm font-medium text-foreground">
              <ShieldCheck className="h-3.5 w-3.5 text-planned" />
              {device.label}
            </p>
            <p className="text-[11px] text-muted-foreground">
              ID {device.deviceId}
              {device.lastSyncedAt
                ? ` · Last sync ${new Date(device.lastSyncedAt).toLocaleString()}`
                : ""}
            </p>
          </div>
          <Button
            size="sm"
            variant="ghost"
            className="h-8 shrink-0 text-muted-foreground hover:text-unplanned"
            onClick={() => void db.trustedSenders.delete(device.deviceId)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </li>
      ))}
    </ul>
  );
}