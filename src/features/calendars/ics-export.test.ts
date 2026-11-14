import { describe, expect, it } from "vitest";
import { buildTeamCalendar, escapeText, foldLine, formatUtc } from "./ics-export";

describe("escapeText", () => {
  it("escapes backslashes, commas, semicolons and newlines", () => {
    expect(escapeText("a\\b, c; d\ne\r\nf")).toBe("a\\\\b\\, c\\; d\\ne\\nf");
  });
});

describe("foldLine", () => {
  it("keeps lines of up to 75 octets unchanged", () => {
    const line = "X".repeat(75);
    expect(foldLine(line)).toBe(line);
  });

  it("folds longer lines into chunks of at most 75 octets", () => {
    const line = `DESCRIPTION:${"a".repeat(200)}`;
    const parts = foldLine(line).split("\r\n");
    expect(parts.length).toBeGreaterThan(1);
    for (const part of parts) {
      expect(Buffer.byteLength(part, "utf8")).toBeLessThanOrEqual(75);
    }
    expect(parts.slice(1).every((part) => part.startsWith(" "))).toBe(true);
    expect(parts.map((part, i) => (i === 0 ? part : part.slice(1))).join("")).toBe(line);
  });

  it("never splits a multi-byte character", () => {
    const line = `SUMMARY:${"ñ".repeat(100)}`;
    const parts = foldLine(line).split("\r\n");
    for (const part of parts) {
      expect(Buffer.byteLength(part, "utf8")).toBeLessThanOrEqual(75);
      expect(part).not.toContain("�");
    }
    expect(parts.map((part, i) => (i === 0 ? part : part.slice(1))).join("")).toBe(line);
  });
});

describe("formatUtc", () => {
  it("formats an instant as a UTC iCalendar timestamp", () => {
    expect(formatUtc(new Date("2026-07-15T17:05:09.123Z"))).toBe("20260715T170509Z");
  });
});

describe("buildTeamCalendar", () => {
  const ics = buildTeamCalendar(
    [
      {
        id: "11111111-1111-4111-8111-111111111111",
        title: "Meetup: AWS, Lambda; y más",
        starts_at: "2026-07-15T17:00:00+00:00",
        ends_at: "2026-07-15T19:30:00+00:00",
        location: "Madrid, España",
        meetup_url: "https://www.meetup.com/example-group/events/123/",
      },
      {
        id: "22222222-2222-4222-8222-222222222222",
        title: "Sin hora de fin",
        starts_at: "2026-08-01T10:00:00Z",
        ends_at: null,
        location: null,
        meetup_url: null,
      },
    ],
    { now: new Date("2026-07-01T00:00:00Z"), domain: "app.example.com" },
  );
  const lines = ics.split("\r\n");

  it("wraps events in a CRLF VCALENDAR", () => {
    expect(lines[0]).toBe("BEGIN:VCALENDAR");
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
    expect(lines.filter((line) => line === "BEGIN:VEVENT")).toHaveLength(2);
  });

  it("writes escaped fields and UTC times", () => {
    expect(lines).toContain("SUMMARY:Meetup: AWS\\, Lambda\\; y más");
    expect(lines).toContain("LOCATION:Madrid\\, España");
    expect(lines).toContain("DTSTART:20260715T170000Z");
    expect(lines).toContain("DTEND:20260715T193000Z");
    expect(lines).toContain("DTSTAMP:20260701T000000Z");
    expect(lines).toContain("UID:11111111-1111-4111-8111-111111111111@app.example.com");
    expect(ics.replace(/\r\n /g, "")).toContain(
      "DESCRIPTION:Meetup: https://www.meetup.com/example-group/events/123/",
    );
  });

  it("defaults a missing end to two hours after the start", () => {
    expect(lines).toContain("DTEND:20260801T120000Z");
  });
});
