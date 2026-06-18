/// <reference lib="webworker" />
import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import {
  CacheFirst,
  ExpirationPlugin,
  NetworkFirst,
  Serwist,
} from "serwist";

declare const self: ServiceWorkerGlobalScope & SerwistGlobalConfig & {
  __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
};

function getBasePath(): string {
  return self.location.pathname.replace(/\/sw\.js$/, "") || "";
}

function withTrailingSlash(path: string): string {
  if (path === "/" || path.endsWith("/")) return path;
  return `${path}/`;
}

/** Offline-capable routes — trailing slashes match next.config trailingSlash. */
const OFFLINE_ROUTE_SUFFIXES = [
  "/",
  "/board/",
  "/reports/",
  "/settings/",
  "/settings/account/",
  "/settings/appearance/",
  "/settings/ai/",
  "/settings/app/",
  "/settings/data/",
  "/settings/about/",
  "/settings/tags/",
  "/tags/",
  "/offline/",
] as const;

function offlineUrl(path: string): string {
  const base = getBasePath();
  const normalized = withTrailingSlash(path);
  if (!base) return normalized;
  return `${base}${normalized}`;
}

const OFFLINE_FALLBACK_URL = offlineUrl("/offline/");

function isOfflineCapableDocument(pathname: string): boolean {
  const normalized = withTrailingSlash(pathname.endsWith("/") ? pathname : `${pathname}/`);
  const base = getBasePath();
  const relative =
    base && pathname.startsWith(base)
      ? withTrailingSlash(pathname.slice(base.length) || "/")
      : normalized;

  return OFFLINE_ROUTE_SUFFIXES.some(
    (route) => relative === route || relative === withTrailingSlash(route),
  );
}

/** Prefer CacheFirst for offline-capable HTML; keep Serwist defaults for assets. */
const runtimeCaching = [
  ...defaultCache.filter((entry) => {
    if (typeof entry.matcher === "function") {
      const m = entry.matcher.toString();
      return !m.includes("text/html") && !m.includes("Content-Type");
    }
    return true;
  }),
  {
    matcher: ({ request, url, sameOrigin }: { request: Request; url: URL; sameOrigin: boolean }) =>
      sameOrigin &&
      request.mode === "navigate" &&
      isOfflineCapableDocument(url.pathname),
    handler: new CacheFirst({
      cacheName: "hesia-offline-documents",
      plugins: [
        new ExpirationPlugin({
          maxEntries: 48,
          maxAgeSeconds: 365 * 24 * 60 * 60,
          maxAgeFrom: "last-used",
        }),
      ],
    }),
  },
  {
    matcher: ({ request, sameOrigin }: { request: Request; sameOrigin: boolean }) =>
      sameOrigin && request.mode === "navigate",
    handler: new NetworkFirst({
      cacheName: "hesia-navigate-fallback",
      networkTimeoutSeconds: 3,
      plugins: [
        new ExpirationPlugin({
          maxEntries: 32,
          maxAgeSeconds: 7 * 24 * 60 * 60,
          maxAgeFrom: "last-used",
        }),
      ],
    }),
  },
];

const serwist = new Serwist({
  precacheEntries: [
    ...(self.__SW_MANIFEST ?? []),
    { url: OFFLINE_FALLBACK_URL, revision: "hesia-offline-v2" },
    ...OFFLINE_ROUTE_SUFFIXES.map((route) => ({
      url: offlineUrl(route),
      revision: "hesia-offline-v2",
    })),
  ],
  skipWaiting: false,
  clientsClaim: true,
  navigationPreload: false,
  runtimeCaching,
  fallbacks: {
    entries: [
      {
        url: OFFLINE_FALLBACK_URL,
        matcher({ request }: { request: Request }) {
          return request.mode === "navigate";
        },
      },
    ],
  },
});

serwist.addEventListeners();

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    void self.skipWaiting();
  }
});