import { execSync } from "node:child_process";
import type { NextConfig } from "next";
import packageJson from "./package.json" with { type: "json" };

// Commit of this build: Vercel's system env var, or the local git HEAD.
function localCommitSha() {
  try {
    return execSync("git rev-parse HEAD", { stdio: ["ignore", "pipe", "ignore"] })
      .toString()
      .trim();
  } catch {
    return "";
  }
}

const nextConfig: NextConfig = {
  // Inlined at build time; shown in the panel (src/lib/build-info.ts).
  env: {
    NEXT_PUBLIC_APP_VERSION: packageJson.version,
    NEXT_PUBLIC_COMMIT_SHA: process.env.VERCEL_GIT_COMMIT_SHA || localCommitSha(),
    NEXT_PUBLIC_DEPLOY_ENV: process.env.VERCEL_ENV ?? "",
    NEXT_PUBLIC_GIT_REF: process.env.VERCEL_GIT_COMMIT_REF ?? "",
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
