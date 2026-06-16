import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex w-full flex-col items-center justify-center rounded-3xl border border-dashed border-border bg-card/40 px-4 py-10 text-center sm:px-8 sm:py-16",
        className,
      )}
    >
      <div className="mb-4 flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-muted/60">
        <Icon className="h-7 w-7 text-muted-foreground" strokeWidth={1.5} />
      </div>
      <h3 className="mb-2 text-base font-medium text-foreground sm:text-lg">{title}</h3>
      <p className="mb-6 w-full text-sm leading-relaxed text-muted-foreground">
        {description}
      </p>
      {action}
    </div>
  );
}