import { afterEach, describe, expect, it, vi } from "vitest";
import { retentionCutoff, settleWithin } from "./retention";

describe("retentionCutoff", () => {
  it("defaults to 24 hours before now", () => {
    const now = new Date("2026-11-15T04:00:00.000Z");
    expect(retentionCutoff(now).toISOString()).toBe("2026-11-14T04:00:00.000Z");
  });

  it("accepts a custom number of hours", () => {
    const now = new Date("2026-11-15T04:00:00.000Z");
    expect(retentionCutoff(now, 1).toISOString()).toBe("2026-11-15T03:00:00.000Z");
  });

  it("does not mutate the input date", () => {
    const now = new Date("2026-11-15T04:00:00.000Z");
    retentionCutoff(now);
    expect(now.toISOString()).toBe("2026-11-15T04:00:00.000Z");
  });
});

describe("settleWithin", () => {
  afterEach(() => vi.useRealTimers());

  it("counts fulfilled and rejected tasks", async () => {
    const result = await settleWithin(
      [Promise.resolve(1), Promise.reject(new Error("x")), Promise.resolve(2)],
      1000,
    );
    expect(result).toEqual({ fulfilled: 2, failed: 1 });
  });

  it("counts tasks still pending at the deadline as failed", async () => {
    vi.useFakeTimers();
    const never = new Promise<void>(() => {});
    const pending = settleWithin([Promise.resolve(), never], 500);
    await vi.advanceTimersByTimeAsync(500);
    await expect(pending).resolves.toEqual({ fulfilled: 1, failed: 1 });
  });

  it("returns zero counts for no tasks", async () => {
    await expect(settleWithin([], 1000)).resolves.toEqual({ fulfilled: 0, failed: 0 });
  });
});
