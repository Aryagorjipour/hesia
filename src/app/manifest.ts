import type { MetadataRoute } from "next";
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
    background_color: "#09090b",
    theme_color: "#0d9488",
    orientation: "portrait-primary",
    categories: ["productivity", "lifestyle"],
    icons: [
      {
        src: withBasePath("/icons/icon-192.png"),
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: withBasePath("/icons/icon-512.png"),
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: withBasePath("/icons/icon-maskable-512.png"),
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "Board",
        short_name: "Board",
        url: withBasePath("/board"),
        icons: [
          { src: withBasePath("/icons/icon-192.png"), sizes: "192x192" },
        ],
      },
      {
        name: "Reports",
        short_name: "Reports",
        url: withBasePath("/reports"),
        icons: [
          { src: withBasePath("/icons/icon-192.png"), sizes: "192x192" },
        ],
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