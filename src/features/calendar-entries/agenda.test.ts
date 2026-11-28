import { describe, expect, it } from "vitest";
import { dayAgenda, entryLabel, memberColor, mergeRanges } from "./agenda";
import type { CalendarEntry } from "./types";

const monday = "2026-11-16";

const entry = (overrides: Partial<CalendarEntry>): CalendarEntry => ({
  id: "e1",
  member_email: "ana@example.com",
  title: "Revisión",
  notes: null,
  starts_at: "2026-11-16T09:00:00Z", // 10:00 Madrid
  ends_at: "2026-11-16T10:00:00Z",
  visibility: "details",
  is_group_meeting: false,
  meeting_url: null,
  is_own: false,
  ...overrides,
});

describe("entryLabel", () => {
  it("shows the title of a 'details' entry", () => {
    expect(entryLabel(entry({}))).toBe("Revisión");
  });

  it("shows only 'Ocupado' for someone else's busy-only entry, even with a title", () => {
    expect(entryLabel(entry({ visibility: "busy", title: "Secreto" }))).toBe("Ocupado");
    expect(entryLabel(entry({ visibility: "busy", title: null }))).toBe("Ocupado");
  });

  it("shows the title of the member's own busy-only entry", () => {
    expect(entryLabel(entry({ visibility: "busy", is_own: true }))).toBe("Revisión");
  });

  it("always shows the title of a group meeting", () => {
    expect(entryLabel(entry({ visibility: "busy", is_group_meeting: true }))).toBe("Revisión");
  });

  it("falls back to 'Ocupado' when the title is missing", () => {
    expect(entryLabel(entry({ title: null }))).toBe("Ocupado");
  });
});

describe("mergeRanges", () => {
  it("merges overlapping and touching ranges of the same date", () => {
    expect(
      mergeRanges([
        { date: monday, start: 600, end: 660, weight: 1, source: "a" },
        { date: monday, start: 630, end: 700, weight: 0.5 },
        { date: monday, start: 700, end: 720, weight: 1 },
        { date: monday, start: 800, end: 830, weight: 1 },
        { date: "2026-11-17", start: 600, end: 630, weight: 1 },
      ]),
    ).toEqual([
      { date: monday, start: 600, end: 720 },
      { date: monday, start: 800, end: 830 },
      { date: "2026-11-17", start: 600, end: 630 },
    ]);
  });
});

describe("memberColor", () => {
  it("keeps a valid hex color and falls back otherwise", () => {
    expect(memberColor("#12ab34", 0)).toBe("#12ab34");
    expect(memberColor("red; background:url(x)", 0)).toMatch(/^oklch\(/);
    expect(memberColor(null, 1)).toMatch(/^oklch\(/);
    expect(memberColor(null, 1)).not.toBe(memberColor(null, 2));
  });
});

describe("dayAgenda", () => {
  const members = [
    { email: "ana@example.com", name: "Ana", color: "#112233" },
    { email: "bea@example.com", name: "Bea", color: null },
  ];

  it("lists entries and Google busy time of the selected people, sorted by time", () => {
    const items = dayAgenda({
      date: monday,
      members,
      selected: ["ana@example.com", "bea@example.com"],
      entries: [
        entry({}),
        entry({ id: "e2", member_email: "bea@example.com", visibility: "busy", title: null }),
      ],
      google: { "ana@example.com": [{ date: monday, start: 8 * 60, end: 9 * 60 }] },
    });
    expect(items.map((i) => [i.name, i.start, i.end, i.label, i.kind])).toEqual([
      ["Ana", "08:00", "09:00", "Ocupado", "google"],
      ["Ana", "10:00", "11:00", "Revisión", "entry"],
      ["Bea", "10:00", "11:00", "Ocupado", "entry"],
    ]);
    expect(items[0].color).toBe("#112233");
  });

  it("skips people who are not selected and other dates", () => {
    const items = dayAgenda({
      date: monday,
      members,
      selected: ["bea@example.com"],
      entries: [entry({}), entry({ id: "e3", member_email: "bea@example.com", starts_at: "2026-11-17T09:00:00Z", ends_at: "2026-11-17T10:00:00Z" })],
      google: { "ana@example.com": [{ date: monday, start: 480, end: 540 }] },
    });
    expect(items).toEqual([]);
  });

  it("marks group meetings", () => {
    const [item] = dayAgenda({
      date: monday,
      members,
      selected: ["ana@example.com"],
      entries: [entry({ is_group_meeting: true })],
      google: {},
    });
    expect(item.groupMeeting).toBe(true);
  });
});
