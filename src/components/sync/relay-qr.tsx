"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/lib/toast";

interface RelayQrProps {
  url: string;
  label?: string;
}

export function RelayQr({ url, label }: RelayQrProps) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void QRCode.toDataURL(url, {
      margin: 1,
      width: 220,
      errorCorrectionLevel: "M",
      color: { dark: "#1a2420", light: "#ffffff" },
    }).then((result) => {
      if (!cancelled) setDataUrl(result);
    });
    return () => {
      cancelled = true;
    };
  }, [url]);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success({ title: "Relay URL copied", description: "" });
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error({ title: "Could not copy URL", description: "" });
    }
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="rounded-2xl border border-border bg-white p-3">
        {dataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={dataUrl} alt="Relay URL QR" width={220} height={220} className="rounded-xl" />
        ) : (
          <div className="h-[220px] w-[220px] animate-pulse rounded-xl bg-muted" />
        )}
      </div>
      {label ? <p className="text-xs text-muted-foreground">{label}</p> : null}
      <p className="max-w-xs break-all text-center font-mono text-[11px] text-muted-foreground">
        {url}
      </p>
      <Button type="button" size="sm" variant="outline" onClick={() => void handleCopy()}>
        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        Copy relay URL
      </Button>
    </div>
  );
}