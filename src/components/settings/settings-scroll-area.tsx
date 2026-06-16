import { cn } from "@/lib/utils/cn";

interface SettingsScrollAreaProps {
  children: React.ReactNode;
  className?: string;
}

export function SettingsScrollArea({
  children,
  className,
}: SettingsScrollAreaProps) {
  return (
    <div
      className={cn(
        "min-h-0 flex-1 overflow-y-auto pb-bottom-nav lg:overflow-visible lg:pb-0",
        className,
      )}
    >
      {children}
    </div>
  );
}