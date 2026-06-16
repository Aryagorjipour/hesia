import Link from "next/link";
import { WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Offline",
};

export default function OfflinePage() {
  return (
    <div className="flex min-h-dvh-safe flex-col items-center justify-center bg-background px-6 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted/40">
        <WifiOff className="h-7 w-7 text-muted-foreground" />
      </div>
      <h1 className="text-xl font-medium text-foreground">You&apos;re offline</h1>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        This page isn&apos;t cached yet. If you&apos;ve used Hesia before, try
        opening the board — your data lives on this device.
      </p>
      <Button asChild className="mt-6">
        <Link href="/board">Go to board</Link>
      </Button>
    </div>
  );
}