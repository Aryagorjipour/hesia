/**
 * Post-build: inject static-export HTML shells into Serwist precache manifest.
 * Next.js static export HTML is not part of the webpack compilation, so shells
 * must be added after `next build` when `out/` exists.
 */
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const OFFLINE_CAPABLE_PATHS = [
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
];

function offlinePathToHtmlFile(path) {
  const normalized = path.endsWith("/") ? path : `${path}/`;
  if (normalized === "/") return "index.html";
  return `${normalized.slice(1)}index.html`;
}

function joinBasePath(basePath, path) {
  const base = basePath.replace(/\/$/, "");
  const normalized = path.endsWith("/") ? path : `${path}/`;
  if (!base) return normalized;
  return `${base}${normalized}`;
}

function fileHash(filePath) {
  return createHash("md5").update(readFileSync(filePath)).digest("hex");
}

function buildShellEntries(outDir, basePath) {
  const entries = [];
  for (const route of OFFLINE_CAPABLE_PATHS) {
    const htmlRel = offlinePathToHtmlFile(route);
    const htmlPath = join(outDir, htmlRel);
    if (!existsSync(htmlPath)) {
      console.warn(`[precache] missing ${htmlPath}, skipping ${route}`);
      continue;
    }
    entries.push({
      url: joinBasePath(basePath, route),
      revision: fileHash(htmlPath),
    });
  }
  return entries;
}

function injectIntoSw(swPath, shellEntries) {
  if (!existsSync(swPath)) {
    console.warn(`[precache] no sw at ${swPath}, skipping`);
    return false;
  }
  let sw = readFileSync(swPath, "utf8");
  const marker = "/* __HESIA_OFFLINE_SHELLS_START__ */";
  const endMarker = "/* __HESIA_OFFLINE_SHELLS_END__ */";

  const block = `${marker}${JSON.stringify(shellEntries)}${endMarker}`;

  if (sw.includes(marker)) {
    sw = sw.replace(
      new RegExp(`${marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[\\s\\S]*?${endMarker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`),
      block,
    );
  } else if (sw.includes("precacheEntries:[")) {
    sw = sw.replace(
      "precacheEntries:[",
      `precacheEntries:[...(()=>{try{const m=/* __HESIA_OFFLINE_SHELLS_START__ */${JSON.stringify(shellEntries)}/* __HESIA_OFFLINE_SHELLS_END__ */;return Array.isArray(m)?m:[]}catch{return[]}})(),`,
    );
  } else {
    console.warn(`[precache] could not find injection point in ${swPath}`);
    return false;
  }

  writeFileSync(swPath, sw);
  return true;
}

const outDir = join(root, "out");
if (!existsSync(outDir)) {
  console.log("[precache] out/ not found — skip (standalone build)");
  process.exit(0);
}

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const shellEntries = buildShellEntries(outDir, basePath);
console.log(`[precache] ${shellEntries.length} HTML shells for basePath="${basePath || "/"}"`);

const targets = [
  join(root, "public", "sw.js"),
  join(outDir, "sw.js"),
];

let injected = 0;
for (const target of targets) {
  if (injectIntoSw(target, shellEntries)) injected++;
}

if (injected === 0) {
  console.error("[precache] failed to inject into any sw.js");
  process.exit(1);
}

console.log(`[precache] injected into ${injected} service worker file(s)`);