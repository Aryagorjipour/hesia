"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db/schema";

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const settings = useLiveQuery(() => db.settings.get("default"));

  const isLoading = settings === undefined;
  const alreadyComplete =
    settings !== undefined && settings.onboardingComplete;

  useEffect(() => {
    if (alreadyComplete) {
      router.replace("/board");
    }
  }, [alreadyComplete, router]);

  if (isLoading || alreadyComplete) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-pulse rounded-full bg-accent/30" />
      </div>
    );
  }

  return <>{children}</>;
}