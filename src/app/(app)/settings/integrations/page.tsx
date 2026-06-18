"use client";

import { Monitor } from "lucide-react";
import { SettingsPageHeader } from "@/components/settings/settings-page-header";
import { SettingsScrollArea } from "@/components/settings/settings-scroll-area";
import { IntegrationsView } from "@/features/settings/integrations-view";
import { isDesktop } from "@/lib/platform";

export default function IntegrationsSettingsPage() {
  if (!isDesktop()) {
    return (
      <div className="mx-auto flex h-full min-h-0 w-full max-w-2xl flex-col">
        <SettingsPageHeader
          title="Integrations"
          description="Email companion, MCP servers, and locale display."
        />
        <SettingsScrollArea>
          <div className="flex flex-col items-center gap-4 p-8 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted">
              <Monitor className="h-6 w-6 text-muted-foreground" strokeWidth={1.5} />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">
                Desktop only
              </p>
              <p className="text-xs leading-relaxed text-muted-foreground">
                Integrations require the Hesia desktop app running locally.
                Email relay, MCP tools, and native connections are not
                available in the web version.
              </p>
            </div>
          </div>
        </SettingsScrollArea>
      </div>
    );
  }

  return (
    <div className="mx-auto flex h-full min-h-0 w-full max-w-2xl flex-col">
      <SettingsPageHeader
        title="Integrations"
        description="Email companion, MCP servers, and locale display."
      />

      <SettingsScrollArea>
        <div className="p-4 pb-bottom-nav sm:p-6 lg:p-8">
          <IntegrationsView />
        </div>
      </SettingsScrollArea>
    </div>
  );
}
