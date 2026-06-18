"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, BarChart3, MessageCircle, Settings, Tag } from "lucide-react";
import { cn } from "@/lib/utils/cn";

const NAV_ITEMS = [
  { href: "/board", label: "Board", icon: LayoutGrid },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/chat", label: "Chat", icon: MessageCircle },
  { href: "/tags", label: "Tags", icon: Tag },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-card/90 backdrop-blur-lg pe-safe ps-safe lg:hidden">
      <div className="mx-auto flex min-h-16 max-w-lg items-center justify-around px-2 pb-[max(0.5rem,env(safe-area-inset-bottom,0px))] pt-1">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "touch-target flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl px-0.5 py-2 text-[10px] transition-colors",
                active ? "text-accent" : "text-muted-foreground",
              )}
            >
              <Icon className="h-5 w-5 shrink-0" strokeWidth={active ? 2 : 1.5} />
              <span className="w-full truncate text-center font-medium leading-none">
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}