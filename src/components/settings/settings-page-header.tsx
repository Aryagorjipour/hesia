import { MobilePageHeader } from "@/components/layout/mobile-page-header";

interface SettingsPageHeaderProps {
  title: string;
  description: string;
}

export function SettingsPageHeader({
  title,
  description,
}: SettingsPageHeaderProps) {
  return (
    <MobilePageHeader
      title={title}
      subtitle={description}
      backHref="/settings"
      backLabel="Settings"
      className="px-4 sm:px-6 lg:px-8"
    />
  );
}