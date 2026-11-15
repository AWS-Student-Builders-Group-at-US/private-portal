import { describe, expect, it } from "vitest";
import {
  addDays,
  busyBlocksToRanges,
  minutesToTime,
  timeToMinutes,
  weekdayOf,
  weekStart,
} from "./slots";


describe("time helpers", () => {
  it("converts between HH:MM(:SS) and minutes", () => {
    expect(timeToMinutes("09:30")).toBe(570);
    expect(timeToMinutes("09:30:00")).toBe(570);
    expect(minutesToTime(570)).toBe("09:30");
    expect(minutesToTime(24 * 60)).toBe("24:00");
  });

  it("uses Monday = 0 and finds the week start", () => {
    expect(weekdayOf("2026-11-16")).toBe(0); // Monday
    expect(weekdayOf("2026-11-22")).toBe(6); // Sunday
    expect(weekStart("2026-11-19")).toBe("2026-11-16");
    expect(weekStart("2026-11-22")).toBe("2026-11-16");
    expect(addDays("2026-11-30", 1)).toBe("2026-12-01");
  });
});

describe("busyBlocksToRanges", () => {
  it("converts UTC blocks into Madrid day ranges and splits at midnight", () => {
    // 2026-11-16 is CET (UTC+1).
    expect(
      busyBlocksToRanges([
        { start: "2026-11-16T09:00:00Z", end: "2026-11-16T10:30:00Z" },
        { start: "2026-11-16T22:00:00Z", end: "2026-11-17T08:00:00Z" },
      ]),
    ).toEqual([
      { date: "2026-11-16", start: 600, end: 690, weight: 1 },
      { date: "2026-11-16", start: 1380, end: 1440, weight: 1 },
      { date: "2026-11-17", start: 0, end: 540, weight: 1 },
    ]);
  });

  it("ignores empty or inverted blocks", () => {
    expect(
      busyBlocksToRanges([
        { start: "2026-11-16T10:00:00Z", end: "2026-11-16T10:00:00Z" },
        { start: "2026-11-16T11:00:00Z", end: "2026-11-16T10:00:00Z" },
      ]),
    ).toEqual([]);
  });
});

describe("busyBlocksToRanges with Date objects", () => {
  it("accepts the Date blocks returned by getBusyBlocks", () => {
    expect(
      busyBlocksToRanges([
        { start: new Date("2026-11-16T09:00:00Z"), end: new Date("2026-11-16T10:00:00Z") },
      ]),
    ).toEqual([{ date: "2026-11-16", start: 600, end: 660, weight: 1 }]);
  });

  it("carries the feed weight and source of each block", () => {
    expect(
      busyBlocksToRanges([
        {
          start: new Date("2026-11-16T09:00:00Z"),
          end: new Date("2026-11-16T10:00:00Z"),
          weight: 0.5,
          feedId: "feed-a",
        },
      ]),
    ).toEqual([{ date: "2026-11-16", start: 600, end: 660, weight: 0.5, source: "feed-a" }]);
  });
});
