import { SettingsPageHeader } from "@/components/settings/settings-page-header";
import { AccountView } from "@/features/settings/account-view";

export default function AccountSettingsPage() {
  return (
    <div className="mx-auto flex h-full w-full max-w-2xl flex-col">
      <SettingsPageHeader
        title="Account"
        description="Your name and workspace — local, private, and exportable."
      />
      <AccountView />
    </div>
  );
}