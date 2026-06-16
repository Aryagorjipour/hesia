import { P2pReceiveView } from "@/features/settings/p2p-receive-view";
import { SettingsScrollArea } from "@/components/settings/settings-scroll-area";

export default function P2pReceivePage() {
  return (
    <div className="mx-auto flex h-full min-h-0 w-full max-w-2xl flex-col">
      <SettingsScrollArea>
        <P2pReceiveView />
      </SettingsScrollArea>
    </div>
  );
}