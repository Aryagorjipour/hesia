import { SettingsPageHeader } from "@/components/settings/settings-page-header";
import { SettingsScrollArea } from "@/components/settings/settings-scroll-area";
import { AccountView } from "@/features/settings/account-view";

export default function AccountSettingsPage() {
  return (
    <div className="mx-auto flex h-full min-h-0 w-full max-w-2xl flex-col">
      <SettingsPageHeader
        title="Account"
        description="Your name and workspace — local, private, and exportable."
      />
      <SettingsScrollArea>
        <AccountView />
      </SettingsScrollArea>
    </div>
  );
}