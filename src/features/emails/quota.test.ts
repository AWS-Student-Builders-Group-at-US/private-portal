import { describe, expect, it } from "vitest";
import { CHUNK_SIZE, DAILY_LIMIT, checkDailyQuota, nextChunk } from "./quota";

describe("checkDailyQuota", () => {
  it("uses a 450/day cap and chunks of 25", () => {
    expect(DAILY_LIMIT).toBe(450);
    expect(CHUNK_SIZE).toBe(25);
  });

  it("allows a send that fits exactly", () => {
    expect(checkDailyQuota({ sentLast24h: 400, pending: 50 })).toEqual({ ok: true });
  });

  it("refuses a send that would exceed the cap and explains it", () => {
    const decision = checkDailyQuota({ sentLast24h: 400, pending: 51 });
    expect(decision.ok).toBe(false);
    if (!decision.ok) {
      expect(decision.available).toBe(50);
      expect(decision.message).toMatch(/24 horas/);
      expect(decision.message).toContain("450");
    }
  });

  it("refuses when the cap is already used up", () => {
    const decision = checkDailyQuota({ sentLast24h: 460, pending: 1 });
    expect(decision.ok).toBe(false);
    if (!decision.ok) expect(decision.available).toBe(0);
  });

  it("allows nothing pending", () => {
    expect(checkDailyQuota({ sentLast24h: 450, pending: 0 })).toEqual({ ok: true });
  });
});

describe("nextChunk", () => {
  const recipients = Array.from(
    { length: 60 },
    (_, i) => `p${String(i).padStart(2, "0")}@example.com`,
  );

  it("takes at most 25 recipients not yet handled", () => {
    const { chunk, remaining } = nextChunk(recipients, []);
    expect(chunk).toHaveLength(25);
    expect(chunk[0]).toBe("p00@example.com");
    expect(remaining).toBe(60);
  });

  it("skips recipients already handled for the campaign", () => {
    const { chunk, remaining } = nextChunk(recipients, recipients.slice(0, 50));
    expect(chunk).toEqual(recipients.slice(50));
    expect(remaining).toBe(10);
  });

  it("returns an empty chunk when everything was handled", () => {
    expect(nextChunk(recipients, recipients)).toEqual({ chunk: [], remaining: 0 });
  });

  it("honours a smaller size", () => {
    expect(nextChunk(recipients, [], 3).chunk).toHaveLength(3);
  });
});
