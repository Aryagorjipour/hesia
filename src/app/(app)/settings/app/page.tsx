import { SettingsPageHeader } from "@/components/settings/settings-page-header";
import { AppInstallView } from "@/features/settings/app-install-view";

export default function AppSettingsPage() {
  return (
    <div className="mx-auto flex h-full w-full max-w-2xl flex-col">
      <SettingsPageHeader
        title="App"
        description="Install Hesia and use it offline on your device."
      />
      <AppInstallView />
    </div>
  );
}