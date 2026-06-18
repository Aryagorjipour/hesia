"use client";

import { SettingsPageHeader } from "@/components/settings/settings-page-header";
import { SettingsScrollArea } from "@/components/settings/settings-scroll-area";
import { IntegrationsView } from "@/features/settings/integrations-view";

export default function IntegrationsSettingsPage() {
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