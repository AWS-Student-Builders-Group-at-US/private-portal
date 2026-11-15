import { describe, expect, it } from "vitest";
import {
  commonFreeRanges,
  formatOccupation,
  occupationColor,
  occupationForDay,
  occupationRatio,
  slotOccupationForDay,
  teamOccupation,
  type OccupationByMember,
} from "./occupation";
import { SLOTS_PER_DAY, busyBlocksToRanges, slotIndex, timeToMinutes } from "./slots";

// Slot grid: 08:00–22:00 in 30-minute slots (index 0 = 08:00).
const s = (time: string) => slotIndex(timeToMinutes(time));
const m = (time: string) => timeToMinutes(time);
const monday = "2026-11-16";
const empty = { template: [], overrides: [], busy: [] };

describe("occupationForDay", () => {
  it("is 0 everywhere without template, overrides or Google blocks", () => {
    const row = occupationForDay(monday, empty);
    expect(row).toHaveLength(SLOTS_PER_DAY);
    expect(row.every((v) => v === 0)).toBe(true);
  });

  it("uses the feed weight of Google blocks and the max when they overlap", () => {
    const row = occupationForDay(monday, {
      ...empty,
      busy: [
        { date: monday, start: m("10:00"), end: m("11:00"), weight: 0.5 },
        { date: monday, start: m("10:30"), end: m("11:30"), weight: 1 },
      ],
    });
    expect(row[s("10:00")]).toBe(0.5);
    expect(row[s("10:30")]).toBe(1);
    expect(row[s("11:00")]).toBe(1);
    expect(row[s("11:30")]).toBe(0);
  });

  it("counts partial overlaps of a slot", () => {
    const row = occupationForDay(monday, {
      ...empty,
      busy: [{ date: monday, start: m("10:15"), end: m("10:45"), weight: 0.5 }],
    });
    expect(row[s("09:30")]).toBe(0);
    expect(row[s("10:00")]).toBe(0.5);
    expect(row[s("10:30")]).toBe(0.5);
    expect(row[s("11:00")]).toBe(0);
  });

  it("ignores blocks on other dates", () => {
    const row = occupationForDay(monday, {
      ...empty,
      busy: [{ date: "2026-11-17", start: m("10:00"), end: m("11:00"), weight: 1 }],
    });
    expect(row.every((v) => v === 0)).toBe(true);
  });

  it("a busy override is 1, even over a lighter Google block", () => {
    const row = occupationForDay(monday, {
      ...empty,
      overrides: [{ date: monday, start_time: "12:00", end_time: "12:45", kind: "busy" }],
      busy: [{ date: monday, start: m("12:00"), end: m("13:00"), weight: 0.5 }],
    });
    expect(row[s("12:00")]).toBe(1);
    expect(row[s("12:30")]).toBe(1); // partial overlap 12:30–12:45
    expect(row[s("13:00")]).toBe(0);
  });

  it("with a template, slots outside the free windows of that weekday are 1", () => {
    const row = occupationForDay(monday, {
      ...empty,
      template: [
        { weekday: 0, start_time: "10:00", end_time: "12:00" },
        { weekday: 1, start_time: "08:00", end_time: "22:00" },
      ],
    });
    expect(row[s("09:30")]).toBe(1);
    expect(row[s("10:00")]).toBe(0);
    expect(row[s("11:30")]).toBe(0);
    expect(row[s("12:00")]).toBe(1);
  });

  it("with a template but nothing painted for that weekday, the whole day is 1", () => {
    const row = occupationForDay(monday, {
      ...empty,
      template: [{ weekday: 1, start_time: "08:00", end_time: "22:00" }],
    });
    expect(row.every((v) => v === 1)).toBe(true);
  });

  it("a free override sets the manual part to 0 but Google weights still apply", () => {
    const row = occupationForDay(monday, {
      template: [{ weekday: 1, start_time: "08:00", end_time: "22:00" }],
      overrides: [{ date: monday, start_time: "16:00", end_time: "18:00", kind: "free" }],
      busy: [{ date: monday, start: m("17:00"), end: m("17:30"), weight: 0.5 }],
    });
    expect(row[s("15:30")]).toBe(1);
    expect(row[s("16:00")]).toBe(0);
    expect(row[s("17:00")]).toBe(0.5);
    expect(row[s("17:30")]).toBe(0);
    expect(row[s("18:00")]).toBe(1);
  });

  it("busy wins over a free override in the same slot", () => {
    const row = occupationForDay(monday, {
      ...empty,
      overrides: [
        { date: monday, start_time: "10:00", end_time: "11:00", kind: "free" },
        { date: monday, start_time: "10:00", end_time: "11:00", kind: "busy" },
      ],
    });
    expect(row[s("10:00")]).toBe(1);
  });

  it("clips ranges to the visible grid", () => {
    const row = occupationForDay(monday, {
      ...empty,
      busy: [
        { date: monday, start: m("06:00"), end: m("08:10"), weight: 1 },
        { date: monday, start: m("21:50"), end: 24 * 60, weight: 0.5 },
      ],
    });
    expect(row[0]).toBe(1);
    expect(row[1]).toBe(0);
    expect(row[SLOTS_PER_DAY - 1]).toBe(0.5);
    expect(row).toHaveLength(SLOTS_PER_DAY);
  });

  it("maps Google blocks on a Madrid DST change day (CEST -> CET)", () => {
    // 2026-10-25: clocks go back at 03:00 CEST. 09:00Z is 10:00 CET.
    const busy = busyBlocksToRanges([
      { start: "2026-10-25T09:00:00Z", end: "2026-10-25T10:00:00Z", weight: 0.5 },
    ]);
    const row = occupationForDay("2026-10-25", { ...empty, busy });
    expect(row[s("09:30")]).toBe(0);
    expect(row[s("10:00")]).toBe(0.5);
    expect(row[s("10:30")]).toBe(0.5);
    expect(row[s("11:00")]).toBe(0);
  });
});

describe("slotOccupationForDay", () => {
  it("separates manual and Google parts and keeps the source of each block", () => {
    const detail = slotOccupationForDay(monday, {
      template: [{ weekday: 0, start_time: "10:00", end_time: "12:00" }],
      overrides: [],
      busy: [{ date: monday, start: m("09:30"), end: m("10:30"), weight: 0.5, source: "feed-a" }],
    });
    expect(detail[s("09:30")]).toEqual({
      value: 1,
      manual: 1,
      google: [{ source: "feed-a", weight: 0.5 }],
    });
    expect(detail[s("10:00")]).toEqual({
      value: 0.5,
      manual: 0,
      google: [{ source: "feed-a", weight: 0.5 }],
    });
    expect(detail[s("10:30")]).toEqual({ value: 0, manual: 0, google: [] });
  });
});

describe("team occupation", () => {
  const perMember: OccupationByMember = {
    ana: { [monday]: Array.from({ length: SLOTS_PER_DAY }, (_, i) => (i < 4 ? 1 : 0)) },
    bea: { [monday]: Array.from({ length: SLOTS_PER_DAY }, (_, i) => (i < 2 ? 0.5 : 0)) },
  };

  it("sums the occupation of the selected members per slot", () => {
    const sums = teamOccupation(perMember, ["ana", "bea"], [monday]);
    expect(sums[monday][0]).toBe(1.5);
    expect(sums[monday][2]).toBe(1);
    expect(sums[monday][4]).toBe(0);
    expect(teamOccupation(perMember, ["bea"], [monday])[monday][0]).toBe(0.5);
  });

  it("treats a member without data as unoccupied", () => {
    expect(teamOccupation(perMember, ["zoe"], [monday])[monday][0]).toBe(0);
  });

  it("finds the ranges where the team sum is 0", () => {
    expect(commonFreeRanges(perMember, ["ana", "bea"], [monday])).toEqual([
      { date: monday, start: "10:00", end: "22:00" },
    ]);
    expect(commonFreeRanges(perMember, ["bea"], [monday])).toEqual([
      { date: monday, start: "09:00", end: "22:00" },
    ]);
  });

  it("returns no common ranges when nobody is selected", () => {
    expect(commonFreeRanges(perMember, [], [monday])).toEqual([]);
  });
});

describe("color scale", () => {
  it("maps 0 to the green end and n to the red end", () => {
    expect(occupationRatio(0, 4)).toBe(0);
    expect(occupationRatio(2, 4)).toBe(0.5);
    expect(occupationRatio(4, 4)).toBe(1);
    expect(occupationColor(0, 4)).toBe(occupationColor(0, 1));
    expect(occupationColor(4, 4)).toBe(occupationColor(1, 1));
    expect(occupationColor(0, 4)).not.toBe(occupationColor(4, 4));
  });

  it("is safe with n = 0 and clamps out-of-range values", () => {
    expect(occupationRatio(0, 0)).toBe(0);
    expect(occupationRatio(3, 0)).toBe(0);
    expect(occupationRatio(5, 4)).toBe(1);
    expect(occupationRatio(-1, 4)).toBe(0);
  });

  it("formats values with a decimal comma", () => {
    expect(formatOccupation(1.5)).toBe("1,5");
    expect(formatOccupation(2)).toBe("2");
    expect(formatOccupation(0)).toBe("0");
  });
});
