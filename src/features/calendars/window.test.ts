import { describe, expect, it } from "vitest";
import { GOOGLE_WINDOW_DAYS, googleWindow, isOutsideGoogleWindow } from "./window";

const DAY_MS = 24 * 60 * 60 * 1000;
const now = new Date("2026-11-15T10:00:00Z");

describe("Google refresh window", () => {
  it("spans 30 days back and 30 days ahead", () => {
    expect(GOOGLE_WINDOW_DAYS).toBe(30);
    const { from, to } = googleWindow(now);
    expect(now.getTime() - from.getTime()).toBe(30 * DAY_MS);
    expect(to.getTime() - now.getTime()).toBe(30 * DAY_MS);
  });

  it("flags ranges that leave the window", () => {
    const inside = [new Date("2026-11-09T00:00:00Z"), new Date("2026-11-16T00:00:00Z")] as const;
    expect(isOutsideGoogleWindow(...inside, now)).toBe(false);
    expect(
      isOutsideGoogleWindow(new Date("2026-12-14T00:00:00Z"), new Date("2026-12-21T00:00:00Z"), now),
    ).toBe(true);
    expect(
      isOutsideGoogleWindow(new Date("2026-10-12T00:00:00Z"), new Date("2026-10-19T00:00:00Z"), now),
    ).toBe(true);
  });
});
