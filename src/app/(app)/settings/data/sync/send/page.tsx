import { P2pSendView } from "@/features/settings/p2p-send-view";
import { SettingsScrollArea } from "@/components/settings/settings-scroll-area";

export default function P2pSendPage() {
  return (
    <div className="mx-auto flex h-full min-h-0 w-full max-w-2xl flex-col">
      <SettingsScrollArea>
        <P2pSendView />
      </SettingsScrollArea>
    </div>
  );
}