// Version and commit of the running build, so the team can tell at a glance
// whether a change is deployed. Values are inlined at build time by
// `next.config.ts` (Vercel system env vars, or git locally).

const REPO_URL = "https://github.com/AWS-Student-Builders-Group-at-US/private-portal";
const SHA_PATTERN = /^[0-9a-f]{7,40}$/i;

const ENVIRONMENT_LABELS: Record<string, string> = {
  production: "Producción",
  preview: "Preview",
  development: "Desarrollo",
};

export type BuildInput = {
  version?: string;
  commitSha?: string;
  deployEnv?: string;
  gitRef?: string;
};

export type BuildInfo = {
  version: string | null;
  commit: string | null;
  commitUrl: string | null;
  environment: string;
  ref: string | null;
};

export function describeBuild(input: BuildInput): BuildInfo {
  const sha = input.commitSha && SHA_PATTERN.test(input.commitSha) ? input.commitSha : null;
  return {
    version: input.version ? `v${input.version}` : null,
    commit: sha ? sha.slice(0, 7) : null,
    commitUrl: sha ? `${REPO_URL}/commit/${sha}` : null,
    environment: (input.deployEnv && ENVIRONMENT_LABELS[input.deployEnv]) || "Local",
    ref: input.gitRef || null,
  };
}

// `process.env.NEXT_PUBLIC_*` is replaced at build time, so this works on both
// server and client components.
export const BUILD_INFO = describeBuild({
  version: process.env.NEXT_PUBLIC_APP_VERSION,
  commitSha: process.env.NEXT_PUBLIC_COMMIT_SHA,
  deployEnv: process.env.NEXT_PUBLIC_DEPLOY_ENV,
  gitRef: process.env.NEXT_PUBLIC_GIT_REF,
});
