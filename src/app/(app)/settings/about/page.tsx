import { SettingsPageHeader } from "@/components/settings/settings-page-header";
import { SettingsScrollArea } from "@/components/settings/settings-scroll-area";
import { AboutView } from "@/features/settings/about-view";

export default function AboutSettingsPage() {
  return (
    <div className="mx-auto flex h-full min-h-0 w-full max-w-2xl flex-col">
      <SettingsPageHeader
        title="About"
        description="Version, credits, and project details."
      />
      <SettingsScrollArea>
        <AboutView />
      </SettingsScrollArea>
    </div>
  );
}