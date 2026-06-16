"use client";

import { useEffect } from "react";
import { withBasePath } from "@/lib/app/site";

const shouldRegister =
  typeof window !== "undefined" &&
  "serviceWorker" in navigator &&
  (process.env.NODE_ENV === "production" ||
    process.env.NEXT_PUBLIC_SERWIST_DEV === "1");

export function SwRegister() {
  useEffect(() => {
    if (!shouldRegister) return;

    navigator.serviceWorker.register(withBasePath("/sw.js")).catch((err) => {
      console.warn("Service worker registration failed:", err);
    });
  }, []);

  return null;
}