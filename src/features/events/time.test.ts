import { describe, expect, it } from "vitest";
import {
  formatMadridDateTime,
  madridLocalToUtcIso,
  utcIsoToMadridLocal,
} from "./time";

describe("madridLocalToUtcIso", () => {
  it("converts winter wall time (UTC+1)", () => {
    expect(madridLocalToUtcIso("2026-01-15T19:00")).toBe(
      "2026-01-15T18:00:00.000Z",
    );
  });

  it("converts summer wall time (UTC+2)", () => {
    expect(madridLocalToUtcIso("2026-07-15T19:00")).toBe(
      "2026-07-15T17:00:00.000Z",
    );
  });

  it("uses the right offset on both sides of the spring DST change", () => {
    // 2026-03-29: clocks jump from 02:00 to 03:00 local time.
    expect(madridLocalToUtcIso("2026-03-29T01:30")).toBe(
      "2026-03-29T00:30:00.000Z",
    );
    expect(madridLocalToUtcIso("2026-03-29T03:30")).toBe(
      "2026-03-29T01:30:00.000Z",
    );
  });

  it("uses the right offset on both sides of the autumn DST change", () => {
    // 2026-10-25: clocks go back from 03:00 to 02:00 local time.
    expect(madridLocalToUtcIso("2026-10-25T01:30")).toBe(
      "2026-10-24T23:30:00.000Z",
    );
    expect(madridLocalToUtcIso("2026-10-25T04:00")).toBe(
      "2026-10-25T03:00:00.000Z",
    );
  });

  it("rejects malformed input", () => {
    expect(() => madridLocalToUtcIso("15/01/2026 19:00")).toThrow();
    expect(() => madridLocalToUtcIso("2026-02-30T10:00")).toThrow();
  });
});

describe("utcIsoToMadridLocal", () => {
  it("round-trips winter and summer values back to the input value", () => {
    for (const local of [
      "2026-01-15T19:00",
      "2026-07-15T19:00",
      "2026-03-29T03:30",
      "2026-10-25T04:00",
    ]) {
      expect(utcIsoToMadridLocal(madridLocalToUtcIso(local))).toBe(local);
    }
  });

  it("accepts Postgres timestamptz output", () => {
    expect(utcIsoToMadridLocal("2026-07-15T17:00:00+00:00")).toBe(
      "2026-07-15T19:00",
    );
  });
});

describe("formatMadridDateTime", () => {
  it("formats in Madrid time with Spanish locale", () => {
    const text = formatMadridDateTime("2026-07-15T17:00:00.000Z");
    expect(text).toContain("19:00");
    expect(text).toContain("2026");
  });
});
