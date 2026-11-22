import { describe, expect, it } from "vitest";
import { hourRange, layoutDay } from "./week-layout";

const item = (key: string, start: string, end: string) => ({ key, start, end });
const lanes = (blocks: { key: string; lane: number; lanes: number }[]) =>
  Object.fromEntries(blocks.map((b) => [b.key, [b.lane, b.lanes]]));

describe("layoutDay", () => {
  it("gives separate items one full-width lane each", () => {
    const blocks = layoutDay([item("a", "09:00", "10:00"), item("b", "11:00", "12:00")]);
    expect(lanes(blocks)).toEqual({ a: [0, 1], b: [0, 1] });
    expect(blocks[0]).toMatchObject({ startMinutes: 540, endMinutes: 600 });
  });

  it("puts overlapping items side by side", () => {
    const blocks = layoutDay([item("a", "09:00", "10:30"), item("b", "10:00", "11:00")]);
    expect(lanes(blocks)).toEqual({ a: [0, 2], b: [1, 2] });
  });

  it("treats touching items as not overlapping", () => {
    const blocks = layoutDay([item("a", "09:00", "10:00"), item("b", "10:00", "11:00")]);
    expect(lanes(blocks)).toEqual({ a: [0, 1], b: [0, 1] });
  });

  it("reuses a freed lane inside a chain of overlaps", () => {
    const blocks = layoutDay([
      item("a", "09:00", "10:00"),
      item("b", "09:30", "11:00"),
      item("c", "10:00", "10:30"),
    ]);
    expect(lanes(blocks)).toEqual({ a: [0, 2], b: [1, 2], c: [0, 2] });
  });

  it("sizes each group of overlaps on its own", () => {
    const blocks = layoutDay([
      item("a", "09:00", "10:00"),
      item("b", "09:00", "10:00"),
      item("c", "09:00", "10:00"),
      item("d", "12:00", "13:00"),
    ]);
    expect(lanes(blocks)).toEqual({ a: [0, 3], b: [1, 3], c: [2, 3], d: [0, 1] });
  });

  it("orders by start, longer items first, regardless of input order", () => {
    const blocks = layoutDay([item("short", "09:00", "09:30"), item("long", "09:00", "11:00")]);
    expect(blocks.map((b) => b.key)).toEqual(["long", "short"]);
    expect(lanes(blocks)).toEqual({ long: [0, 2], short: [1, 2] });
  });

  it("runs an item that ends at or after midnight to the end of the day", () => {
    const [block] = layoutDay([item("late", "23:00", "00:00")]);
    expect(block).toMatchObject({ startMinutes: 1380, endMinutes: 1440 });
  });
});

describe("hourRange", () => {
  it("defaults to 08:00–22:00", () => {
    expect(hourRange([])).toEqual({ from: 480, to: 1320 });
    expect(hourRange([item("a", "10:00", "11:00")])).toEqual({ from: 480, to: 1320 });
  });

  it("widens to whole hours that cover every item", () => {
    expect(hourRange([item("a", "07:15", "09:00"), item("b", "21:00", "22:30")])).toEqual({
      from: 420,
      to: 1380,
    });
    expect(hourRange([item("late", "23:00", "00:00")])).toEqual({ from: 480, to: 1440 });
  });
});
