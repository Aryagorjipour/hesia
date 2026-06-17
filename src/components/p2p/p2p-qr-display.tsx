"use client";

import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import { Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/button";
import { toast } from "@/lib/toast";

interface P2pQrDisplayProps {
  value: string;
  label?: string;
  size?: "md" | "lg";
  className?: string;
}

function estimateQrWidth(charLength: number, size: "md" | "lg"): number {
  const version = Math.min(25, Math.max(5, Math.ceil(charLength / 90)));
  const base = size === "lg" ? 280 : 240;
  return Math.min(360, base + version * 4);
}

export function P2pQrDisplay({
  value,
  label,
  size = "md",
  className,
}: P2pQrDisplayProps) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const qrWidth = useMemo(
    () => estimateQrWidth(value.length, size),
    [value.length, size],
  );

  useEffect(() => {
    let cancelled = false;
    void QRCode.toDataURL(value, {
      margin: 1,
      width: qrWidth,
      errorCorrectionLevel: "L",
      color: { dark: "#1a2420", light: "#ffffff" },
    }).then((url) => {
      if (!cancelled) setDataUrl(url);
    });
    return () => {
      cancelled = true;
    };
  }, [value, qrWidth]);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success({
        title: "Pairing code copied",
        description: "Paste it on the other device if scanning is slow.",
      });
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error({
        title: "Could not copy",
        description: "Select and copy the pairing code manually.",
      });
    }
  }

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
            className="rounded-xl"
            style={{ width: qrWidth, height: qrWidth }}
          />
        ) : (
          <div
            className="animate-pulse rounded-xl bg-muted"
            style={{ width: qrWidth, height: qrWidth }}
          />
        )}
      </div>

      <div className="flex flex-col items-center gap-2">
        {label ? (
          <p className="text-center text-xs text-muted-foreground">{label}</p>
        ) : null}
        <p className="text-center text-[11px] text-muted-foreground/80">
          {value.length} chars · scan or copy below
        </p>
        <Button type="button" size="sm" variant="outline" onClick={() => void handleCopy()}>
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5" />
              Copied
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" />
              Copy pairing code
            </>
          )}
        </Button>
      </div>
    </div>
  );
}