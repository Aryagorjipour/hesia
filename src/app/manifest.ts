import type { MetadataRoute } from "next";
import { BRAND } from "@/lib/app/branding";
import { APP_NAME, withBasePath } from "@/lib/app/site";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  const scope = withBasePath("/");

  return {
    id: scope,
    name: APP_NAME,
    short_name: APP_NAME,
    description:
      "Privacy-first local Kanban and reflection companion with contextual AI.",
    start_url: withBasePath("/board"),
    scope,
    display: "standalone",
    background_color: "#2d3a36",
    theme_color: "#7a9e97",
    orientation: "portrait-primary",
    categories: ["productivity", "lifestyle"],
    icons: [
      {
        src: BRAND.pwa192,
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: BRAND.pwa512,
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: BRAND.pwa512,
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: BRAND.appleTouchIcon,
        sizes: "180x180",
        type: "image/png",
        purpose: "any",
      },
    ],
    shortcuts: [
      {
        name: "Board",
        short_name: "Board",
        url: withBasePath("/board"),
        icons: [{ src: BRAND.pwa192, sizes: "192x192" }],
      },
      {
        name: "Reports",
        short_name: "Reports",
        url: withBasePath("/reports"),
        icons: [{ src: BRAND.pwa192, sizes: "192x192" }],
      },
    ],
    screenshots: [
      {
        src: withBasePath("/screenshots/mobile-narrow.png"),
        sizes: "390x844",
        type: "image/png",
        form_factor: "narrow",
      },
      {
        src: withBasePath("/screenshots/desktop-wide.png"),
        sizes: "1280x720",
        type: "image/png",
        form_factor: "wide",
      },
    ],
  };
}