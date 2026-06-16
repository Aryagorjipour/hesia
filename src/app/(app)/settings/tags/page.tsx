"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function TagsSettingsRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/tags");
  }, [router]);

  return null;
}