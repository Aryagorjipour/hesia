import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { AppProviders } from "@/components/providers/app-providers";
import { SwRegister } from "@/components/providers/sw-register";
import { BRAND } from "@/lib/app/branding";
import { APP_NAME, withBasePath } from "@/lib/app/site";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: APP_NAME,
    template: `%s · ${APP_NAME}`,
  },
  description:
    "A privacy-first, local Kanban and reflection companion. Track planned work and flow wins — entirely in your browser.",
  applicationName: APP_NAME,
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: APP_NAME,
  },
  icons: {
    icon: [
      { url: BRAND.favicon, sizes: "any" },
      { url: BRAND.favicon16, sizes: "16x16", type: "image/png" },
      { url: BRAND.favicon32, sizes: "32x32", type: "image/png" },
      { url: BRAND.pwa192, sizes: "192x192", type: "image/png" },
      { url: BRAND.pwa512, sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: BRAND.appleTouchIcon, sizes: "180x180", type: "image/png" }],
    shortcut: [BRAND.favicon],
  },
  manifest: withBasePath("/manifest.webmanifest"),
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#b8c4bc" },
    { media: "(prefers-color-scheme: dark)", color: "#2d3a36" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      dir="ltr"
      className={`${inter.variable} h-full`}
      suppressHydrationWarning
    >
      <body className="min-h-full antialiased">
        <AppProviders>
          {children}
          <SwRegister />
        </AppProviders>
      </body>
    </html>
  );
}