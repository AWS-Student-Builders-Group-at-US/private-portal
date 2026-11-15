import { describe, expect, it } from "vitest";
import {
  formatNoteRange,
  noteCoversCell,
  notesForCell,
  notesInWeek,
  rectFromCorners,
  type NoteRect,
} from "./notes";
import { SLOTS_PER_DAY, slotIndex, timeToMinutes, weekDates } from "./slots";

// Slot grid: 08:00–22:00 in 30-minute slots (index 0 = 08:00).
const s = (time: string) => slotIndex(timeToMinutes(time));
const m = (time: string) => timeToMinutes(time);
const week = weekDates("2026-11-16"); // Monday 16 … Sunday 22

const rect = (overrides: Partial<NoteRect> = {}): NoteRect => ({
  start_date: "2026-11-17",
  end_date: "2026-11-18",
  start_minute: m("10:00"),
  end_minute: m("12:00"),
  ...overrides,
});

describe("rectFromCorners", () => {
  it("turns two corners into a rectangle that includes both end cells", () => {
    expect(
      rectFromCorners(
        { date: "2026-11-17", slot: s("10:00") },
        { date: "2026-11-18", slot: s("11:30") },
      ),
    ).toEqual(rect());
  });

  it("normalizes corners picked in any order", () => {
    const expected = rect();
    expect(
      rectFromCorners(
        { date: "2026-11-18", slot: s("10:00") },
        { date: "2026-11-17", slot: s("11:30") },
      ),
    ).toEqual(expected);
    expect(
      rectFromCorners(
        { date: "2026-11-18", slot: s("11:30") },
        { date: "2026-11-17", slot: s("10:00") },
      ),
    ).toEqual(expected);
  });

  it("makes a one-slot rectangle when both corners are the same cell", () => {
    expect(
      rectFromCorners(
        { date: "2026-11-20", slot: s("21:30") },
        { date: "2026-11-20", slot: s("21:30") },
      ),
    ).toEqual({
      start_date: "2026-11-20",
      end_date: "2026-11-20",
      start_minute: m("21:30"),
      end_minute: m("22:00"),
    });
  });
});

describe("notesInWeek", () => {
  it("keeps notes that overlap the week, including those crossing its edges", () => {
    const inside = { id: "a", ...rect() };
    const fromBefore = { id: "b", ...rect({ start_date: "2026-11-10", end_date: "2026-11-16" }) };
    const intoNext = { id: "c", ...rect({ start_date: "2026-11-22", end_date: "2026-11-25" }) };
    const before = { id: "d", ...rect({ start_date: "2026-11-09", end_date: "2026-11-15" }) };
    const after = { id: "e", ...rect({ start_date: "2026-11-23", end_date: "2026-11-23" }) };
    expect(notesInWeek([inside, fromBefore, intoNext, before, after], week)).toEqual([
      inside,
      fromBefore,
      intoNext,
    ]);
  });

  it("returns nothing for an empty week", () => {
    expect(notesInWeek([{ id: "a", ...rect() }], [])).toEqual([]);
  });
});

describe("noteCoversCell", () => {
  const note = rect();

  it("covers every slot of every day inside the rectangle", () => {
    expect(noteCoversCell(note, "2026-11-17", s("10:00"))).toBe(true);
    expect(noteCoversCell(note, "2026-11-18", s("11:30"))).toBe(true);
  });

  it("does not cover slots outside its days or hours", () => {
    expect(noteCoversCell(note, "2026-11-16", s("10:00"))).toBe(false);
    expect(noteCoversCell(note, "2026-11-19", s("10:00"))).toBe(false);
    expect(noteCoversCell(note, "2026-11-17", s("09:30"))).toBe(false);
    expect(noteCoversCell(note, "2026-11-17", s("12:00"))).toBe(false);
  });

  it("covers a slot that the note only partly overlaps", () => {
    const partial = rect({ start_minute: m("10:15"), end_minute: m("10:45") });
    expect(noteCoversCell(partial, "2026-11-17", s("10:00"))).toBe(true);
    expect(noteCoversCell(partial, "2026-11-17", s("10:30"))).toBe(true);
    expect(noteCoversCell(partial, "2026-11-17", s("11:00"))).toBe(false);
  });

  it("covers the whole visible day for an all-day note", () => {
    const allDay = rect({ start_minute: 0, end_minute: 24 * 60 });
    expect(noteCoversCell(allDay, "2026-11-17", 0)).toBe(true);
    expect(noteCoversCell(allDay, "2026-11-17", SLOTS_PER_DAY - 1)).toBe(true);
  });
});

describe("notesForCell", () => {
  it("returns the notes that cover a cell, in input order", () => {
    const a = { id: "a", ...rect() };
    const b = { id: "b", ...rect({ start_minute: m("11:00"), end_minute: m("13:00") }) };
    expect(notesForCell([a, b], "2026-11-17", s("11:00"))).toEqual([a, b]);
    expect(notesForCell([a, b], "2026-11-17", s("12:30"))).toEqual([b]);
    expect(notesForCell([a, b], "2026-11-17", s("08:00"))).toEqual([]);
  });
});

describe("formatNoteRange", () => {
  it("shows one day with its time range", () => {
    expect(
      formatNoteRange(rect({ end_date: "2026-11-17", end_minute: m("12:30") })),
    ).toBe("mar, 17 nov · 10:00–12:30");
  });

  it("shows the first and last day of a multi-day note", () => {
    expect(formatNoteRange(rect())).toBe("mar, 17 nov – mié, 18 nov · 10:00–12:00");
  });
});
