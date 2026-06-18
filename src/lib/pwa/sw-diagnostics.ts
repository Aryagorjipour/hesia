"use client";

import { joinBasePath } from "@/lib/pwa/offline-routes";

export interface CacheBucketSummary {
  name: string;
  entryCount: number;
}

export interface SwDiagnosticsSnapshot {
  supported: boolean;
  controllerState: ServiceWorkerState | "none";
  registrationScope: string | null;
  waitingWorker: boolean;
  installingWorker: boolean;
  updateFound: boolean;
  caches: CacheBucketSummary[];
  precacheShellCount: number;
  lastCheckedAt: string;
  basePath: string;
  offlineCapableRoutes: string[];
}

const PRECACHE_PREFIX = "serwist-precache";

export async function collectSwDiagnostics(
  offlineRoutes: readonly string[],
): Promise<SwDiagnosticsSnapshot> {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  const now = new Date().toISOString();

  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return {
      supported: false,
      controllerState: "none",
      registrationScope: null,
      waitingWorker: false,
      installingWorker: false,
      updateFound: false,
      caches: [],
      precacheShellCount: 0,
      lastCheckedAt: now,
      basePath,
      offlineCapableRoutes: offlineRoutes.map((r) => joinBasePath(basePath, r)),
    };
  }

  const registration = await navigator.serviceWorker.getRegistration();
  const controller = navigator.serviceWorker.controller;

  const cacheNames = await caches.keys();
  const cachesSummary: CacheBucketSummary[] = [];
  let precacheShellCount = 0;

  for (const name of cacheNames) {
    const bucket = await caches.open(name);
    const keys = await bucket.keys();
    cachesSummary.push({ name, entryCount: keys.length });

    if (name.includes(PRECACHE_PREFIX)) {
      for (const req of keys) {
        const path = new URL(req.url).pathname;
        if (
          offlineRoutes.some((route) => {
            const full = joinBasePath(basePath, route);
            return path === full || path === full.replace(/\/$/, "");
          })
        ) {
          precacheShellCount++;
        }
      }
    }
  }

  return {
    supported: true,
    controllerState: controller?.state ?? "none",
    registrationScope: registration?.scope ?? null,
    waitingWorker: Boolean(registration?.waiting),
    installingWorker: Boolean(registration?.installing),
    updateFound: Boolean(registration?.waiting),
    caches: cachesSummary.sort((a, b) => a.name.localeCompare(b.name)),
    precacheShellCount,
    lastCheckedAt: now,
    basePath: basePath || "(none — dev)",
    offlineCapableRoutes: offlineRoutes.map((r) => joinBasePath(basePath, r)),
  };
}