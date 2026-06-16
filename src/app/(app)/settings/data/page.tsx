import { DataPrivacyView } from "@/features/settings/data-privacy-view";
import { SettingsPageHeader } from "@/components/settings/settings-page-header";
import { SettingsScrollArea } from "@/components/settings/settings-scroll-area";

export default function DataSettingsPage() {
  return (
    <div className="mx-auto flex h-full min-h-0 w-full max-w-2xl flex-col">
      <SettingsPageHeader
        title="Data & Privacy"
        description="Export everything. Import anywhere. No lock-in."
      />
      <SettingsScrollArea>
        <DataPrivacyView />
      </SettingsScrollArea>
    </div>
  );
}