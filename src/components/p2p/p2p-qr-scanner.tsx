"use client";

import dynamic from "next/dynamic";
import { useCallback, useRef, useState } from "react";
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
  minLength?: number;
}

export function P2pQrScanner({
  onScan,
  label,
  minLength = 100,
}: P2pQrScannerProps) {
  const [manual, setManual] = useState("");
  const [useCamera, setUseCamera] = useState(true);
  const [paused, setPaused] = useState(false);
  const lastScanRef = useRef<{ value: string; at: number } | null>(null);

  const handleScan = useCallback(
    (value: string) => {
      const trimmed = value.trim();
      if (trimmed.length < minLength) {
        toast.warning({
          title: "Code too short",
          description: "The scan looks incomplete. Try again or paste the full code.",
        });
        return;
      }

      const now = Date.now();
      const last = lastScanRef.current;
      if (last && last.value === trimmed && now - last.at < 2000) {
        return;
      }
      lastScanRef.current = { value: trimmed, at: now };
      setPaused(true);
      onScan(trimmed);
    },
    [minLength, onScan],
  );

  return (
    <div className="space-y-4">
      {label ? (
        <p className="text-sm text-muted-foreground">{label}</p>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="pairing-code">Paste pairing code</Label>
        <Textarea
          id="pairing-code"
          value={manual}
          onChange={(e) => setManual(e.target.value)}
          rows={4}
          placeholder="Paste the pairing code from the other device"
          className="font-mono text-xs"
        />
        <Button
          type="button"
          size="sm"
          disabled={manual.trim().length < minLength}
          onClick={() => handleScan(manual)}
        >
          Use pasted code
        </Button>
      </div>

      {useCamera ? (
        <div className="overflow-hidden rounded-2xl border border-border">
          {!paused ? (
            <Scanner
              onScan={(detected) => {
                const value = detected[0]?.rawValue;
                if (value) handleScan(value);
              }}
              onError={() => {
                toast.warning({
                  title: "Camera unavailable",
                  description: "Paste the pairing code above instead.",
                });
              }}
              constraints={{ facingMode: "environment" }}
              styles={{
                container: { width: "100%", minHeight: 240 },
              }}
            />
          ) : (
            <div className="flex min-h-60 items-center justify-center bg-muted/30 p-6 text-center text-sm text-muted-foreground">
              Code captured. Processing…
            </div>
          )}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => {
            setPaused(false);
            setUseCamera((v) => !v);
          }}
        >
          {useCamera ? "Hide camera" : "Use camera"}
        </Button>
        {paused ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => {
              setPaused(false);
              lastScanRef.current = null;
            }}
          >
            Scan again
          </Button>
        ) : null}
      </div>
    </div>
  );
}