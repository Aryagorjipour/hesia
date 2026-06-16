import { DataPrivacyView } from "@/features/settings/data-privacy-view";
import { SettingsPageHeader } from "@/components/settings/settings-page-header";

export default function DataSettingsPage() {
  return (
    <div className="mx-auto flex h-full w-full max-w-2xl flex-col">
      <SettingsPageHeader
        title="Data & Privacy"
        description="Export everything. Import anywhere. No lock-in."
      />
      <div className="min-h-0 flex-1 overflow-y-auto">
        <DataPrivacyView />
      </div>
    </div>
  );
}