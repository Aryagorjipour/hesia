"use client";

import { cn } from "@/lib/utils/cn";

interface ChartWrapperProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export function ChartWrapper({
  title,
  description,
  children,
  className,
}: ChartWrapperProps) {
  return (
    <div
      className={cn(
        "min-w-0 rounded-2xl border border-border bg-card/60 p-4 backdrop-blur-sm sm:p-5",
        className,
      )}
    >
      <div className="mb-3 sm:mb-4">
        <h3 className="text-sm font-medium text-foreground">{title}</h3>
        {description && (
          <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        )}
      </div>
      <div className="h-[180px] w-full min-w-0 sm:h-[220px]">{children}</div>
    </div>
  );
}