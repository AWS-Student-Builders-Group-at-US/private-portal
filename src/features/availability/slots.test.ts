import { describe, expect, it } from "vitest";
import {
  SLOTS_PER_DAY,
  addDays,
  busyBlocksToRanges,
  cellsToTemplateRanges,
  commonFreeRanges,
  freeSlotsForDay,
  minutesToTime,
  slotIndex,
  teamCounts,
  templateToCells,
  timeToMinutes,
  weekdayOf,
  weekStart,
} from "./slots";

// Slot grid: 08:00–22:00 in 30-minute slots (index 0 = 08:00).
const s = (time: string) => slotIndex(timeToMinutes(time));
const range = (from: string, to: string) => {
  const out: number[] = [];
  for (let i = s(from); i < s(to); i++) out.push(i);
  return out;
};
const sorted = (set: Set<number>) => [...set].sort((a, b) => a - b);

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

describe("freeSlotsForDay", () => {
  const monday = "2026-11-16";

  it("takes the weekly template for that weekday", () => {
    const free = freeSlotsForDay(monday, {
      template: [
        { weekday: 0, start_time: "10:00", end_time: "12:00" },
        { weekday: 1, start_time: "08:00", end_time: "22:00" },
      ],
      overrides: [],
      busy: [],
    });
    expect(sorted(free)).toEqual(range("10:00", "12:00"));
  });

  it("merges overlapping template ranges", () => {
    const free = freeSlotsForDay(monday, {
      template: [
        { weekday: 0, start_time: "10:00", end_time: "12:00" },
        { weekday: 0, start_time: "11:00", end_time: "13:00" },
      ],
      overrides: [],
      busy: [],
    });
    expect(sorted(free)).toEqual(range("10:00", "13:00"));
  });

  it("adds free overrides and removes busy overrides for that date only", () => {
    const free = freeSlotsForDay(monday, {
      template: [{ weekday: 0, start_time: "10:00", end_time: "14:00" }],
      overrides: [
        { date: monday, start_time: "16:00", end_time: "17:00", kind: "free" },
        { date: monday, start_time: "11:00", end_time: "12:00", kind: "busy" },
        { date: "2026-11-23", start_time: "10:00", end_time: "14:00", kind: "busy" },
      ],
      busy: [],
    });
    expect(sorted(free)).toEqual([
      ...range("10:00", "11:00"),
      ...range("12:00", "14:00"),
      ...range("16:00", "17:00"),
    ]);
  });

  it("busy wins over a free override in the same slot", () => {
    const free = freeSlotsForDay(monday, {
      template: [],
      overrides: [
        { date: monday, start_time: "10:00", end_time: "12:00", kind: "busy" },
        { date: monday, start_time: "10:00", end_time: "12:00", kind: "free" },
      ],
      busy: [],
    });
    expect(free.size).toBe(0);
  });

  it("removes Google busy blocks, including partial overlaps of a slot", () => {
    const free = freeSlotsForDay(monday, {
      template: [{ weekday: 0, start_time: "10:00", end_time: "13:00" }],
      overrides: [],
      // 10:15–11:00 blocks the 10:00 and 10:30 slots.
      busy: [{ date: monday, start: timeToMinutes("10:15"), end: timeToMinutes("11:00") }],
    });
    expect(sorted(free)).toEqual(range("11:00", "13:00"));
  });

  it("only counts slots fully covered by free time", () => {
    const free = freeSlotsForDay(monday, {
      template: [{ weekday: 0, start_time: "10:15", end_time: "11:45" }],
      overrides: [],
      busy: [],
    });
    expect(sorted(free)).toEqual(range("10:30", "11:30"));
  });

  it("clips ranges to the visible grid", () => {
    const free = freeSlotsForDay(monday, {
      template: [{ weekday: 0, start_time: "06:00", end_time: "23:30" }],
      overrides: [],
      busy: [],
    });
    expect(free.size).toBe(SLOTS_PER_DAY);
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
      { date: "2026-11-16", start: 600, end: 690 },
      { date: "2026-11-16", start: 1380, end: 1440 },
      { date: "2026-11-17", start: 0, end: 540 },
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

describe("team counts and common ranges", () => {
  const monday = "2026-11-16";
  const perMember = {
    ana: { [monday]: range("10:00", "13:00") },
    bea: { [monday]: range("11:00", "14:00") },
    caro: { [monday]: [...range("08:00", "09:00"), ...range("12:00", "12:30")] },
  };

  it("counts how many selected people are free per slot", () => {
    const counts = teamCounts(perMember, ["ana", "bea"], [monday]);
    expect(counts[monday][s("10:00")]).toBe(1);
    expect(counts[monday][s("11:30")]).toBe(2);
    expect(counts[monday][s("13:30")]).toBe(1);
    expect(counts[monday][s("15:00")]).toBe(0);
  });

  it("finds ranges where everyone selected is free", () => {
    expect(commonFreeRanges(perMember, ["ana", "bea"], [monday])).toEqual([
      { date: monday, start: "11:00", end: "13:00" },
    ]);
    expect(commonFreeRanges(perMember, ["ana", "bea", "caro"], [monday])).toEqual([
      { date: monday, start: "12:00", end: "12:30" },
    ]);
  });

  it("returns nothing when nobody is selected", () => {
    expect(commonFreeRanges(perMember, [], [monday])).toEqual([]);
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
    ).toEqual([{ date: "2026-11-16", start: 600, end: 660 }]);
  });
});
