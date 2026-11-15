import { describe, expect, it } from "vitest";
import {
  addDays,
  busyBlocksToRanges,
  cellsToTemplateRanges,
  minutesToTime,
  slotIndex,
  templateToCells,
  timeToMinutes,
  weekdayOf,
  weekStart,
} from "./slots";

// Slot grid: 08:00–22:00 in 30-minute slots (index 0 = 08:00).
const s = (time: string) => slotIndex(timeToMinutes(time));

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

describe("template cells", () => {
  it("round-trips painted cells to merged ranges", () => {
    const cells = new Set([
      `0:${s("10:00")}`,
      `0:${s("10:30")}`,
      `0:${s("12:00")}`,
      `4:${s("21:30")}`,
    ]);
    const ranges = cellsToTemplateRanges(cells);
    expect(ranges).toEqual([
      { weekday: 0, start_time: "10:00", end_time: "11:00" },
      { weekday: 0, start_time: "12:00", end_time: "12:30" },
      { weekday: 4, start_time: "21:30", end_time: "22:00" },
    ]);
    expect(templateToCells(ranges)).toEqual(cells);
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
