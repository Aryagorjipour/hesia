"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { cn } from "@/lib/utils/cn";

interface P2pQrDisplayProps {
  value: string;
  label?: string;
  size?: "md" | "lg";
  className?: string;
}

export function P2pQrDisplay({
  value,
  label,
  size = "md",
  className,
}: P2pQrDisplayProps) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void QRCode.toDataURL(value, {
      margin: 2,
      width: size === "lg" ? 320 : 220,
      color: { dark: "#1a2420", light: "#f4f8f6" },
    }).then((url) => {
      if (!cancelled) setDataUrl(url);
    });
    return () => {
      cancelled = true;
    };
  }, [value, size]);

  return (
    <div className={cn("flex flex-col items-center gap-3", className)}>
      <div
        className={cn(
          "rounded-2xl border border-border bg-white p-3 shadow-sm",
          size === "lg" ? "p-4" : "p-3",
        )}
      >
        {dataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={dataUrl}
            alt="P2P pairing QR code"
            className={cn(
              "rounded-xl",
              size === "lg" ? "h-80 w-80" : "h-56 w-56",
            )}
          />
        ) : (
          <div
            className={cn(
              "animate-pulse rounded-xl bg-muted",
              size === "lg" ? "h-80 w-80" : "h-56 w-56",
            )}
          />
        )}
      </div>
      {label ? (
        <p className="text-center text-xs text-muted-foreground">{label}</p>
      ) : null}
    </div>
  );
}