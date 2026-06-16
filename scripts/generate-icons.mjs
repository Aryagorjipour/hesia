/**
 * Generates PWA PNG icons and screenshots from the SVG source.
 * Run: node scripts/generate-icons.mjs
 */
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import sharp from "sharp";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const iconsDir = join(root, "public", "icons");
const screenshotsDir = join(root, "public", "screenshots");
const svgPath = join(iconsDir, "icon.svg");

mkdirSync(iconsDir, { recursive: true });
mkdirSync(screenshotsDir, { recursive: true });

const svg = readFileSync(svgPath);

async function generateIcons() {
  const sizes = [
    { name: "icon-192.png", size: 192 },
    { name: "icon-512.png", size: 512 },
    { name: "icon-maskable-512.png", size: 512, padding: 0.15 },
  ];

  for (const { name, size, padding = 0 } of sizes) {
    let buffer;

    if (padding > 0) {
      const inner = Math.round(size * (1 - padding * 2));
      const offset = Math.round(size * padding);
      const innerPng = await sharp(svg).resize(inner, inner).png().toBuffer();
      buffer = await sharp({
        create: {
          width: size,
          height: size,
          channels: 4,
          background: { r: 9, g: 9, b: 11, alpha: 1 },
        },
      })
        .composite([{ input: innerPng, left: offset, top: offset }])
        .png()
        .toBuffer();
    } else {
      buffer = await sharp(svg).resize(size, size).png().toBuffer();
    }

    writeFileSync(join(iconsDir, name), buffer);
    console.log(`Created ${name}`);
  }
}

async function generateScreenshots() {
  const iconPng = await sharp(svg).resize(96, 96).png().toBuffer();

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
        background: { r: 9, g: 9, b: 11, alpha: 1 },
      },
    })
      .composite([
        {
          input: iconPng,
          left: Math.round((width - 96) / 2),
          top: Math.round((height - 96) / 2),
        },
      ])
      .png()
      .toBuffer();

    writeFileSync(join(screenshotsDir, name), buffer);
    console.log(`Created screenshots/${name}`);
  }
}

async function generate() {
  await generateIcons();
  await generateScreenshots();
}

generate().catch(console.error);