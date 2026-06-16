/**
 * Syncs PWA icons from /public/favicon and generates store screenshots from brand logo.
 * Run: node scripts/generate-icons.mjs
 */
import { copyFileSync, mkdirSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import sharp from "sharp";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const iconsDir = join(root, "public", "icons");
const screenshotsDir = join(root, "public", "screenshots");
const faviconDir = join(root, "public", "favicon");
const logoPath = join(root, "public", "assets", "LOGO-TRANSPARENT.png");
const appDir = join(root, "src", "app");

mkdirSync(iconsDir, { recursive: true });
mkdirSync(screenshotsDir, { recursive: true });
mkdirSync(appDir, { recursive: true });

function syncPwaIcons() {
  const copies = [
    [join(faviconDir, "android-chrome-192x192.png"), join(iconsDir, "icon-192.png")],
    [join(faviconDir, "android-chrome-512x512.png"), join(iconsDir, "icon-512.png")],
    [join(faviconDir, "android-chrome-512x512.png"), join(iconsDir, "icon-maskable-512.png")],
    [join(faviconDir, "favicon.ico"), join(appDir, "favicon.ico")],
  ];

  for (const [from, to] of copies) {
    copyFileSync(from, to);
    console.log(`Synced ${to.replace(root + join("", ""), "").replace(root, "").replace(/^[/\\]/, "")}`);
  }
}

async function generateScreenshots() {
  const iconPng = await sharp(logoPath).resize(120, 120).png().toBuffer();

  const screenshots = [
    { name: "mobile-narrow.png", width: 390, height: 844 },
    { name: "desktop-wide.png", width: 1280, height: 720 },
  ];

  for (const { name, width, height } of screenshots) {
    const buffer = await sharp({
      create: {
        width,
        height,
        channels: 4,
        background: { r: 45, g: 58, b: 54, alpha: 1 },
      },
    })
      .composite([
        {
          input: iconPng,
          left: Math.round((width - 120) / 2),
          top: Math.round((height - 120) / 2),
        },
      ])
      .png()
      .toBuffer();

    writeFileSync(join(screenshotsDir, name), buffer);
    console.log(`Created screenshots/${name}`);
  }
}

async function generate() {
  syncPwaIcons();
  await generateScreenshots();
}

generate().catch(console.error);