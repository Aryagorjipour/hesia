"use client";

import { useState } from "react";
import { ChevronDown, Laptop, PlayCircle } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export function RelayCompanionGuide() {
  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
    <div className="space-y-3 rounded-xl border border-border/60 bg-muted/10 p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent/15 text-accent">
          <Laptop className="h-4 w-4" />
        </div>
        <div className="min-w-0 space-y-2 text-sm">
          <p className="font-medium text-foreground">Hesia Companion</p>
          <p className="text-xs leading-relaxed text-muted-foreground">
            A tiny helper app that runs on{" "}
            <span className="font-medium text-foreground">your computer</span> —
            not in the browser. It sends email and connects AI tools while keeping your password off the web.
          </p>
          <ol className="list-decimal space-y-1.5 ps-4 text-xs leading-relaxed text-muted-foreground">
            <li>
              Start <span className="text-foreground">Hesia Companion</span> on
              this machine (ask whoever installed Hesía, or use Advanced below).
            </li>
            <li>
              Click <span className="text-foreground">Test connection</span>{" "}
              above — you should see &quot;Connected&quot;.
            </li>
            <li>Fill in your email provider and app password below.</li>
          </ol>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setShowAdvanced((v) => !v)}
        className="flex w-full items-center justify-between rounded-xl px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted/30 hover:text-foreground"
      >
        <span className="inline-flex items-center gap-1.5">
          <PlayCircle className="h-3.5 w-3.5" />
          Advanced: run from source code
        </span>
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 transition-transform",
            showAdvanced && "rotate-180",
          )}
        />
      </button>

      {showAdvanced && (
        <div className="space-y-2 rounded-xl border border-border/50 bg-card/40 p-3 text-xs leading-relaxed text-muted-foreground">
          <p>If you have the Hesía project folder and Bun installed:</p>
          <pre className="overflow-x-auto rounded-lg bg-muted/40 p-2 font-mono text-[11px] text-foreground">
            cd relay{"\n"}bun install{"\n"}bun run start
          </pre>
          <p>
            Or from the project root:{" "}
            <code className="rounded bg-muted px-1">npm run relay</code>
          </p>
        </div>
      )}
    </div>
  );
}