"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { APP_NAME } from "@/lib/app/site";
import { BRAND } from "@/lib/app/branding";
import { usePrefersReducedMotion } from "@/lib/hooks/use-prefers-reduced-motion";

type LogoVariant = "mark" | "horizontal" | "banner";

interface HesiaLogoProps {
  variant?: LogoVariant;
  className?: string;
  /** Square mark size in px (ignored for horizontal) */
  size?: number;
  priority?: boolean;
  /** Subtle fade-in scale on mount (skipped when reduced motion is preferred). */
  animated?: boolean;
}

const LOGO_EASE = [0.22, 1, 0.36, 1] as const;

function LogoMotion({
  animated,
  className,
  children,
}: {
  animated: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  const reducedMotion = usePrefersReducedMotion();

  if (!animated || reducedMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, scale: 0.94 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.45, ease: LOGO_EASE }}
    >
      {children}
    </motion.div>
  );
}

export function HesiaLogo({
  variant = "mark",
  className,
  size = 40,
  priority = false,
  animated = true,
}: HesiaLogoProps) {
  if (variant === "horizontal") {
    return (
      <LogoMotion animated={animated} className={className}>
        <Image
          src={BRAND.logoHorizontal}
          alt={APP_NAME}
          width={220}
          height={56}
          priority={priority}
          unoptimized
          className="h-10 w-auto max-w-[220px] object-contain"
        />
      </LogoMotion>
    );
  }

  if (variant === "banner") {
    return (
      <LogoMotion animated={animated} className={className}>
        <Image
          src={BRAND.logoHorizontal}
          alt={APP_NAME}
          width={560}
          height={140}
          priority={priority}
          unoptimized
          className="h-20 w-full max-w-xl object-contain sm:h-28 md:h-32"
        />
      </LogoMotion>
    );
  }

  return (
    <LogoMotion animated={animated} className={className}>
      <Image
        src={BRAND.logoSquare}
        alt={APP_NAME}
        width={size}
        height={size}
        priority={priority}
        unoptimized
        className="object-contain"
        style={{ width: size, height: size }}
      />
    </LogoMotion>
  );
}