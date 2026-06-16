"use client";

import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface HesiaStarMarkProps {
  size?: "sm" | "lg";
  className?: string;
  glow?: boolean;
}

const SIZES = {
  sm: { box: "h-10 w-10 rounded-xl", icon: "h-5 w-5" },
  lg: { box: "h-16 w-16 rounded-3xl", icon: "h-8 w-8" },
} as const;

export function HesiaStarMark({
  size = "lg",
  className,
  glow = false,
}: HesiaStarMarkProps) {
  const s = SIZES[size];

  return (
    <div
      className={cn(
        "flex items-center justify-center bg-accent/15",
        s.box,
        glow && "shadow-[0_0_40px_rgba(13,148,136,0.45)]",
        className,
      )}
    >
      <Sparkles className={cn(s.icon, "text-accent")} strokeWidth={1.5} />
    </div>
  );
}