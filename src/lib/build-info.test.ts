import { describe, expect, it } from "vitest";
import { describeBuild } from "./build-info";

const REPO = "https://github.com/AWS-Student-Builders-Group-at-US/private-portal";

describe("describeBuild", () => {
  it("shows version, short commit and environment with a commit link", () => {
    expect(
      describeBuild({
        version: "0.2.0",
        commitSha: "a56505d1234567890abcdef1234567890abcdef0",
        deployEnv: "production",
        gitRef: "main",
      }),
    ).toEqual({
      version: "v0.2.0",
      commit: "a56505d",
      commitUrl: `${REPO}/commit/a56505d1234567890abcdef1234567890abcdef0`,
      environment: "Producción",
      ref: "main",
    });
  });

  it("labels preview deployments and keeps the branch", () => {
    const info = describeBuild({
      version: "0.2.0",
      commitSha: "70937f4aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      deployEnv: "preview",
      gitRef: "feat/ux-mejoras",
    });
    expect(info.environment).toBe("Preview");
    expect(info.ref).toBe("feat/ux-mejoras");
  });

  it("falls back to local without a commit link when the sha is missing or invalid", () => {
    for (const commitSha of ["", undefined, "not-a-sha; rm -rf"]) {
      const info = describeBuild({ version: "0.2.0", commitSha, deployEnv: undefined });
      expect(info.commit).toBeNull();
      expect(info.commitUrl).toBeNull();
      expect(info.environment).toBe("Local");
      expect(info.ref).toBeNull();
    }
  });

  it("omits the version prefix when the version is missing", () => {
    expect(describeBuild({}).version).toBeNull();
  });
});
