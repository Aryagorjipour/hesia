"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { toast } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const Scanner = dynamic(
  () => import("@yudiel/react-qr-scanner").then((mod) => mod.Scanner),
  { ssr: false },
);

interface P2pQrScannerProps {
  onScan: (value: string) => void;
  label?: string;
}

export function P2pQrScanner({ onScan, label }: P2pQrScannerProps) {
  const [manual, setManual] = useState("");
  const [useCamera, setUseCamera] = useState(true);

  return (
    <div className="space-y-4">
      {label ? (
        <p className="text-sm text-muted-foreground">{label}</p>
      ) : null}

      {useCamera ? (
        <div className="overflow-hidden rounded-2xl border border-border">
          <Scanner
            onScan={(detected) => {
              const value = detected[0]?.rawValue;
              if (value) {
                onScan(value);
              }
            }}
            onError={() => {
              toast.warning({
                title: "Camera unavailable",
                description: "Paste the pairing code below instead.",
              });
            }}
            constraints={{ facingMode: "environment" }}
            styles={{
              container: { width: "100%", minHeight: 240 },
            }}
          />
        </div>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="pairing-code">Or paste pairing code</Label>
        <Textarea
          id="pairing-code"
          value={manual}
          onChange={(e) => setManual(e.target.value)}
          rows={4}
          placeholder="Paste the pairing code from the other device"
          className="font-mono text-xs"
        />
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            disabled={!manual.trim()}
            onClick={() => onScan(manual.trim())}
          >
            Use pasted code
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => setUseCamera((v) => !v)}
          >
            {useCamera ? "Hide camera" : "Use camera"}
          </Button>
        </div>
      </div>
    </div>
  );
}