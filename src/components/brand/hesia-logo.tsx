import Image from "next/image";
import { cn } from "@/lib/utils/cn";
import { APP_NAME } from "@/lib/app/site";
import { BRAND } from "@/lib/app/branding";

type LogoVariant = "mark" | "horizontal" | "banner";

interface HesiaLogoProps {
  variant?: LogoVariant;
  className?: string;
  /** Square mark size in px (ignored for horizontal) */
  size?: number;
  priority?: boolean;
}

export function HesiaLogo({
  variant = "mark",
  className,
  size = 40,
  priority = false,
}: HesiaLogoProps) {
  if (variant === "horizontal") {
    return (
      <Image
        src={BRAND.logoHorizontal}
        alt={APP_NAME}
        width={220}
        height={56}
        priority={priority}
        unoptimized
        className={cn("h-10 w-auto max-w-[220px] object-contain", className)}
      />
    );
  }

  if (variant === "banner") {
    return (
      <Image
        src={BRAND.logoHorizontal}
        alt={APP_NAME}
        width={560}
        height={140}
        priority={priority}
        unoptimized
        className={cn(
          "h-20 w-full max-w-xl object-contain sm:h-28 md:h-32",
          className,
        )}
      />
    );
  }

  return (
    <Image
      src={BRAND.logoSquare}
      alt={APP_NAME}
      width={size}
      height={size}
      priority={priority}
      unoptimized
      className={cn("object-contain", className)}
      style={{ width: size, height: size }}
    />
  );
}