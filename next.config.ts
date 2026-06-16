import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

const repoSlug = process.env.NEXT_PUBLIC_REPO_NAME ?? "hesia";
const isGithubPages = process.env.GITHUB_PAGES === "true";
const basePath = isGithubPages ? `/${repoSlug}` : "";

const withSerwist = withSerwistInit({
  swSrc: "src/sw.ts",
  swDest: "public/sw.js",
  disable:
    process.env.NODE_ENV === "development" &&
    process.env.SERWIST_DEV !== "1",
});

const nextConfig: NextConfig = {
  reactStrictMode: true,
  ...(isGithubPages ? { output: "export" as const } : {}),
  basePath,
  assetPrefix: basePath ? `${basePath}/` : undefined,
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
};

export default withSerwist(nextConfig);