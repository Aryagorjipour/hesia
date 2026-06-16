import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface MobilePageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  backHref?: string;
  backLabel?: string;
  className?: string;
}

export function MobilePageHeader({
  title,
  subtitle,
  actions,
  backHref,
  backLabel = "Settings",
  className,
}: MobilePageHeaderProps) {
  return (
    <header
      className={cn(
        "shrink-0 border-b border-border px-3 py-3 sm:px-4 sm:py-4 lg:px-6",
        className,
      )}
    >
      {backHref && (
        <Link
          href={backHref}
          className="-ml-1 mb-2 inline-flex min-h-11 items-center gap-1 rounded-md px-1 text-xs text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
          {backLabel}
        </Link>
      )}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-lg font-medium tracking-tight text-foreground lg:text-2xl">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-0.5 truncate text-xs text-muted-foreground sm:text-sm">
              {subtitle}
            </p>
          )}
        </div>
        {actions && (
          <div className="flex shrink-0 items-center gap-1">{actions}</div>
        )}
      </div>
    </header>
  );
}