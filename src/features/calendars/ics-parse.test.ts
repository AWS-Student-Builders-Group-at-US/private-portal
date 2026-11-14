import { describe, expect, it } from "vitest";
import { extractBusyBlocks } from "./ics-parse";

// Builds a CRLF iCalendar document around the given VEVENT bodies.
function calendar(...events: string[]) {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Test//EN",
    "X-WR-TIMEZONE:Europe/Madrid",
    ...events.flatMap((body) => ["BEGIN:VEVENT", body.trim(), "END:VEVENT"]),
    "END:VCALENDAR",
  ];
  return lines.join("\n").replace(/\n/g, "\r\n");
}

const iso = (blocks: { start: Date; end: Date }[]) =>
  blocks.map(({ start, end }) => [start.toISOString(), end.toISOString()]);

const FROM = new Date("2026-11-01T00:00:00Z");
const TO = new Date("2026-12-31T00:00:00Z");

describe("extractBusyBlocks", () => {
  it("returns a single timed event as one block", () => {
    const ics = calendar(`
UID:single
DTSTAMP:20261101T000000Z
DTSTART;TZID=Europe/Madrid:20261110T100000
DTEND;TZID=Europe/Madrid:20261110T113000
SUMMARY:Private meeting`);
    const blocks = extractBusyBlocks(ics, FROM, TO);
    expect(iso(blocks)).toEqual([["2026-11-10T09:00:00.000Z", "2026-11-10T10:30:00.000Z"]]);
    expect(Object.keys(blocks[0]).sort()).toEqual(["end", "start"]);
  });

  it("maps an all-day event to the whole Madrid day", () => {
    const ics = calendar(
      `
UID:winter-day
DTSTAMP:20261101T000000Z
DTSTART;VALUE=DATE:20261120
DTEND;VALUE=DATE:20261121
SUMMARY:Day off`,
      `
UID:summer-day
DTSTAMP:20261101T000000Z
DTSTART;VALUE=DATE:20270715
DTEND;VALUE=DATE:20270716
SUMMARY:Summer day`,
    );
    expect(iso(extractBusyBlocks(ics, FROM, new Date("2027-12-31T00:00:00Z")))).toEqual([
      ["2026-11-19T23:00:00.000Z", "2026-11-20T23:00:00.000Z"],
      ["2027-07-14T22:00:00.000Z", "2027-07-15T22:00:00.000Z"],
    ]);
  });

  it("expands a weekly RRULE with EXDATE and an overridden instance", () => {
    const ics = calendar(
      `
UID:weekly
DTSTAMP:20261101T000000Z
DTSTART;TZID=Europe/Madrid:20261102T100000
DTEND;TZID=Europe/Madrid:20261102T110000
RRULE:FREQ=WEEKLY;COUNT=4
EXDATE;TZID=Europe/Madrid:20261109T100000
SUMMARY:Weekly`,
      `
UID:weekly
DTSTAMP:20261101T000000Z
RECURRENCE-ID;TZID=Europe/Madrid:20261116T100000
DTSTART;TZID=Europe/Madrid:20261116T150000
DTEND;TZID=Europe/Madrid:20261116T160000
SUMMARY:Weekly (moved)`,
    );
    expect(iso(extractBusyBlocks(ics, FROM, TO))).toEqual([
      ["2026-11-02T09:00:00.000Z", "2026-11-02T10:00:00.000Z"],
      ["2026-11-16T14:00:00.000Z", "2026-11-16T15:00:00.000Z"],
      ["2026-11-23T09:00:00.000Z", "2026-11-23T10:00:00.000Z"],
    ]);
  });

  it("skips transparent (free) and cancelled events", () => {
    const ics = calendar(
      `
UID:free
DTSTAMP:20261101T000000Z
DTSTART:20261110T090000Z
DTEND:20261110T100000Z
TRANSP:TRANSPARENT
SUMMARY:Reminder`,
      `
UID:cancelled
DTSTAMP:20261101T000000Z
DTSTART:20261111T090000Z
DTEND:20261111T100000Z
STATUS:CANCELLED
SUMMARY:Cancelled`,
      `
UID:busy
DTSTAMP:20261101T000000Z
DTSTART:20261112T090000Z
DTEND:20261112T100000Z
SUMMARY:Busy`,
    );
    expect(iso(extractBusyBlocks(ics, FROM, TO))).toEqual([
      ["2026-11-12T09:00:00.000Z", "2026-11-12T10:00:00.000Z"],
    ]);
  });

  it("merges overlapping and touching blocks", () => {
    const ics = calendar(
      `
UID:a
DTSTAMP:20261101T000000Z
DTSTART:20261110T090000Z
DTEND:20261110T100000Z`,
      `
UID:b
DTSTAMP:20261101T000000Z
DTSTART:20261110T093000Z
DTEND:20261110T110000Z`,
      `
UID:c
DTSTAMP:20261101T000000Z
DTSTART:20261110T110000Z
DTEND:20261110T113000Z`,
      `
UID:d
DTSTAMP:20261101T000000Z
DTSTART:20261110T120000Z
DTEND:20261110T130000Z`,
    );
    expect(iso(extractBusyBlocks(ics, FROM, TO))).toEqual([
      ["2026-11-10T09:00:00.000Z", "2026-11-10T11:30:00.000Z"],
      ["2026-11-10T12:00:00.000Z", "2026-11-10T13:00:00.000Z"],
    ]);
  });

  it("clips blocks to the window and drops events outside it", () => {
    const ics = calendar(
      `
UID:edge
DTSTAMP:20261101T000000Z
DTSTART:20261110T080000Z
DTEND:20261110T120000Z`,
      `
UID:before
DTSTAMP:20261101T000000Z
DTSTART:20261109T080000Z
DTEND:20261109T090000Z`,
      `
UID:after
DTSTAMP:20261101T000000Z
DTSTART:20261111T080000Z
DTEND:20261111T090000Z`,
    );
    const from = new Date("2026-11-10T10:00:00Z");
    const to = new Date("2026-11-10T23:00:00Z");
    expect(iso(extractBusyBlocks(ics, from, to))).toEqual([
      ["2026-11-10T10:00:00.000Z", "2026-11-10T12:00:00.000Z"],
    ]);
  });

  it("returns no blocks for an empty calendar", () => {
    expect(extractBusyBlocks(calendar(), FROM, TO)).toEqual([]);
  });
});
