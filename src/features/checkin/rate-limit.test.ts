import { describe, expect, it } from "vitest";
import {
  CHECKIN_MAX_ATTEMPTS,
  UNKNOWN_IP,
  getClientIp,
  isRateLimited,
} from "./rate-limit";

describe("isRateLimited", () => {
  it("allows attempts up to the limit and rejects above it", () => {
    expect(CHECKIN_MAX_ATTEMPTS).toBe(5);
    expect(isRateLimited(0)).toBe(false);
    expect(isRateLimited(4)).toBe(false);
    // Five earlier attempts in the window: the sixth is rejected.
    expect(isRateLimited(5)).toBe(true);
    expect(isRateLimited(12)).toBe(true);
  });

  it("accepts a custom limit", () => {
    expect(isRateLimited(1, 2)).toBe(false);
    expect(isRateLimited(2, 2)).toBe(true);
  });
});

describe("getClientIp", () => {
  it("uses the first x-forwarded-for value", () => {
    const headers = new Headers({
      "x-forwarded-for": " 203.0.113.7 , 10.0.0.1",
      "x-real-ip": "198.51.100.2",
    });
    expect(getClientIp(headers)).toBe("203.0.113.7");
  });

  it("falls back to x-real-ip", () => {
    expect(getClientIp(new Headers({ "x-real-ip": "198.51.100.2" }))).toBe(
      "198.51.100.2",
    );
  });

  it("uses a constant when no IP header is present", () => {
    expect(getClientIp(new Headers())).toBe(UNKNOWN_IP);
    expect(getClientIp(new Headers({ "x-forwarded-for": " , " }))).toBe(
      UNKNOWN_IP,
    );
  });
});
