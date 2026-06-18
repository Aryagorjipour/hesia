import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { rmSync } from "node:fs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const env = {
  ...process.env,
  TAURI_BUILD: "true",
  NEXT_PUBLIC_BASE_PATH: "",
  // NEXT_PUBLIC_REPO_NAME and NEXT_PUBLIC_SITE_URL are intentionally not overridden:
  // basePath resolves to "" because GITHUB_PAGES is unset.
  // SITE_URL falls back to the GitHub Pages URL, which is correct for "Open live app" links.
};

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: root,
    env,
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

// Remove the Serwist-generated SW from public/ so Next.js static export
// does not copy it into out/ for the desktop build.
rmSync(join(root, "public", "sw.js"), { force: true });

run("node", ["scripts/generate-icons.mjs"]);
run("npx", ["next", "build", "--webpack"]);
run("npx", ["@tauri-apps/cli@2", "build"]);
