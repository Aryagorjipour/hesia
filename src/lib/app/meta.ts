import packageJson from "../../../package.json";
import { APP_NAME, SITE_URL } from "./site";

export const APP_META = {
  name: APP_NAME,
  version: packageJson.version,
  siteUrl: SITE_URL,
  tagline: "Privacy-first, local-first Kanban and reflection companion.",
  description:
    "Track planned work and flow wins on a calm daily board, reflect with weekly reports, and chat with an AI companion that reads only what lives on your device — no accounts, no cloud sync, no telemetry.",
  developer: {
    name: "Arya Gorjipour",
    role: "Design & development",
    github: "https://github.com/Aryagorjipour/",
    githubHandle: "Aryagorjipour",
  },
  stack: [
    "Next.js",
    "React",
    "Tailwind CSS",
    "Dexie",
    "Zustand",
    "Serwist PWA",
  ],
  copyrightStartYear: 2026,
} as const;

export function getCopyrightNotice(year = new Date().getFullYear()) {
  const start = APP_META.copyrightStartYear;
  const range = year > start ? `${start}–${year}` : `${start}`;
  return `© ${range} ${APP_META.developer.name}. All rights reserved.`;
}