import { DeviceSyncView } from "@/features/settings/device-sync-view";
import { SettingsScrollArea } from "@/components/settings/settings-scroll-area";

export default function DeviceSyncPage() {
  return (
    <div className="mx-auto flex h-full min-h-0 w-full max-w-2xl flex-col">
      <SettingsScrollArea>
        <DeviceSyncView />
      </SettingsScrollArea>
    </div>
  );
}