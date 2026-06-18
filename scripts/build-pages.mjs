import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const slug = process.env.NEXT_PUBLIC_REPO_NAME ?? "hesia";

const env = {
  ...process.env,
  GITHUB_PAGES: "true",
  NEXT_PUBLIC_BASE_PATH: `/${slug}`,
  NEXT_PUBLIC_REPO_NAME: slug,
  NEXT_PUBLIC_SITE_URL: `https://aryagorjipour.github.io/${slug}`,
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

run("node", ["scripts/generate-icons.mjs"]);
run("npx", ["next", "build", "--webpack"]);
run("node", ["scripts/inject-precache-shells.mjs"]);