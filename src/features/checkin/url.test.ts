import { describe, expect, it } from "vitest";
import { buildCheckinUrl } from "./url";

describe("buildCheckinUrl", () => {
  const token = "0123456789abcdef0123456789abcdef";

  it("joins a base URL without a trailing slash", () => {
    expect(buildCheckinUrl("https://app.example.com", token)).toBe(
      `https://app.example.com/checkin/${token}`,
    );
  });

  it("joins a base URL with trailing slashes", () => {
    expect(buildCheckinUrl("https://app.example.com//", token)).toBe(
      `https://app.example.com/checkin/${token}`,
    );
  });

  it("keeps a base path", () => {
    expect(buildCheckinUrl("http://localhost:3000/app/", token)).toBe(
      `http://localhost:3000/app/checkin/${token}`,
    );
  });
});
