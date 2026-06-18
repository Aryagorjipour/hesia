"use client";

import { useState } from "react";
import { ArrowUpCircle, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface UpdateInfo {
  version: string;
  downloadUrl: string;
}

type UpdateState =
  | { status: "idle" }
  | { status: "checking" }
  | { status: "up-to-date" }
  | { status: "available"; info: UpdateInfo }
  | { status: "error"; message: string };

export function DesktopUpdatePanel({
  currentVersion,
}: {
  currentVersion: string | null;
}) {
  const [state, setState] = useState<UpdateState>({ status: "idle" });

  async function checkUpdate() {
    setState({ status: "checking" });
    try {
      const res = await fetch(
        "https://api.github.com/repos/Aryagorjipour/hesia/releases/latest",
        { headers: { Accept: "application/vnd.github.v3+json" } },
      );
      if (!res.ok) {
        setState({ status: "error", message: "Update check failed" });
        return;
      }
      const data = (await res.json()) as {
        tag_name: string;
        html_url: string;
      };
      const latest = data.tag_name.replace(/^v/, "").replace(/-desktop$/, "");
      if (currentVersion && latest !== currentVersion) {
        setState({
          status: "available",
          info: { version: latest, downloadUrl: data.html_url },
        });
      } else {
        setState({ status: "up-to-date" });
      }
    } catch {
      setState({ status: "error", message: "Could not reach update server" });
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-card/50 p-4 sm:p-5 space-y-3">
      <p className="text-sm font-medium text-foreground">Software updates</p>

      {state.status === "idle" && (
        <Button
          size="sm"
          variant="secondary"
          onClick={() => void checkUpdate()}
        >
          Check for updates
        </Button>
      )}

      {state.status === "checking" && (
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Checking...
        </p>
      )}

      {state.status === "up-to-date" && (
        <p className="flex items-center gap-2 text-xs text-planned">
          <CheckCircle2 className="h-3.5 w-3.5" />
          Hesia is up to date
        </p>
      )}

      {state.status === "available" && (
        <div className="space-y-2">
          <p className="flex items-center gap-2 text-xs text-foreground">
            <ArrowUpCircle className="h-3.5 w-3.5 text-accent" />
            Update available: v{state.info.version}
          </p>
          <Button size="sm" asChild>
            <a
              href={state.info.downloadUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              Download update
            </a>
          </Button>
        </div>
      )}

      {state.status === "error" && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">{state.message}</p>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => void checkUpdate()}
          >
            Retry
          </Button>
        </div>
      )}
    </div>
  );
}
