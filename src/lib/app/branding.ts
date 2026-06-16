import { withBasePath } from "./site";

/** Public brand assets — paths respect GitHub Pages basePath */
export const BRAND = {
  logoSquare: withBasePath("/assets/LOGO-TRANSPARENT.png"),
  logoSquareBg: withBasePath("/assets/LOGO-BACKGROUND.jpg"),
  logoHorizontal: withBasePath("/assets/HORIZENTALLOGO-TRANSPARENT.png"),
  logoHorizontalBg: withBasePath("/assets/HORIZENTALLOGO-BACKGROUND.jpg"),
  favicon: withBasePath("/favicon/favicon.ico"),
  favicon16: withBasePath("/favicon/favicon-16x16.png"),
  favicon32: withBasePath("/favicon/favicon-32x32.png"),
  appleTouchIcon: withBasePath("/favicon/apple-touch-icon.png"),
  pwa192: withBasePath("/favicon/android-chrome-192x192.png"),
  pwa512: withBasePath("/favicon/android-chrome-512x512.png"),
} as const;