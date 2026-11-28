import { describe, expect, it } from "vitest";
import {
  buildTeamCalendar,
  escapeText,
  foldLine,
  formatUtc,
  sequenceFrom,
} from "./ics-export";

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

describe("group calendar", () => {
  const ics = buildTeamCalendar(
    [
      {
        id: "11111111-1111-4111-8111-111111111111",
        title: "Meetup",
        starts_at: "2026-07-15T17:00:00Z",
        ends_at: null,
        location: null,
        meetup_url: null,
      },
    ],
    {
      now: new Date("2026-07-01T00:00:00Z"),
      domain: "app.example.com",
      groupMeetings: [
        {
          id: "33333333-3333-4333-8333-333333333333",
          title: "Reunión del grupo; planificación",
          notes: "Orden del día:\nnoticias",
          starts_at: "2026-07-16T16:00:00Z",
          ends_at: "2026-07-16T17:00:00Z",
        },
        {
          id: "44444444-4444-4444-8444-444444444444",
          title: "Reunión online",
          notes: "Traed ideas",
          meeting_url: "https://meet.example.com/abc-defg-hij",
          starts_at: "2026-07-17T16:00:00Z",
          ends_at: "2026-07-17T17:00:00Z",
        },
      ],
    },
  );
  const lines = ics.split("\r\n");

  it("names the feed after the group", () => {
    expect(lines).toContain("X-WR-CALNAME:AWS US - Student Builder Group");
    expect(lines).toContain("PRODID:-//AWS US Student Builder Group//Calendario//ES");
  });

  it("includes group meetings next to the events, with their own UIDs", () => {
    expect(lines.filter((line) => line === "BEGIN:VEVENT")).toHaveLength(3);
    expect(lines).toContain(
      "UID:entry-33333333-3333-4333-8333-333333333333@app.example.com",
    );
    expect(lines).toContain("SUMMARY:Reunión del grupo\\; planificación");
    expect(lines).toContain("DTSTART:20260716T160000Z");
    expect(lines).toContain("DTEND:20260716T170000Z");
    expect(lines).toContain("DESCRIPTION:Orden del día:\\nnoticias");
  });

  it("adds the meeting link as URL, location and in the description", () => {
    const meeting = ics.split("BEGIN:VEVENT")[3].replace(/\r\n /g, "");
    expect(meeting).toContain("URL:https://meet.example.com/abc-defg-hij");
    expect(meeting).toContain("LOCATION:https://meet.example.com/abc-defg-hij");
    expect(meeting).toContain(
      "DESCRIPTION:Enlace de la reunión: https://meet.example.com/abc-defg-hij\\n\\nTraed ideas",
    );
  });
});

describe("update-safe fields", () => {
  const ics = buildTeamCalendar(
    [
      {
        id: "11111111-1111-4111-8111-111111111111",
        title: "Meetup",
        starts_at: "2026-07-15T17:00:00Z",
        ends_at: null,
        location: null,
        meetup_url: null,
        created_at: "2026-06-01T10:00:00Z",
        updated_at: "2026-06-01T10:02:05.500Z",
      },
      {
        id: "22222222-2222-4222-8222-222222222222",
        title: "Sin marcas de tiempo",
        starts_at: "2026-07-20T17:00:00Z",
        ends_at: null,
        location: null,
        meetup_url: null,
      },
    ],
    {
      now: new Date("2026-07-01T00:00:00Z"),
      domain: "app.example.com",
      groupMeetings: [
        {
          id: "33333333-3333-4333-8333-333333333333",
          title: "Reunión",
          notes: null,
          starts_at: "2026-07-16T16:00:00Z",
          ends_at: "2026-07-16T17:00:00Z",
          created_at: "2026-06-10T08:00:00Z",
          updated_at: "2026-06-10T08:00:00Z",
        },
      ],
    },
  );
  const events = ics
    .split("BEGIN:VEVENT")
    .slice(1)
    .map((block) => block.split("\r\n"));

  it("asks subscribers to refresh every hour", () => {
    const header = ics.split("BEGIN:VEVENT")[0].split("\r\n");
    expect(header).toContain("REFRESH-INTERVAL;VALUE=DURATION:PT1H");
    expect(header).toContain("X-PUBLISHED-TTL:PT1H");
  });

  it("writes CREATED, LAST-MODIFIED and a SEQUENCE that grows with each edit", () => {
    expect(events[0]).toContain("CREATED:20260601T100000Z");
    expect(events[0]).toContain("LAST-MODIFIED:20260601T100205Z");
    expect(events[0]).toContain("SEQUENCE:125");
    expect(events[2]).toContain("SEQUENCE:0");
    expect(events[2]).toContain("LAST-MODIFIED:20260610T080000Z");
  });

  it("falls back to SEQUENCE 0 without timestamps and keeps the UID stable", () => {
    expect(events[1]).toContain("SEQUENCE:0");
    expect(events[1].some((line) => line.startsWith("LAST-MODIFIED"))).toBe(false);
    expect(events[1]).toContain("UID:22222222-2222-4222-8222-222222222222@app.example.com");
  });
});

describe("sequenceFrom", () => {
  it("counts whole seconds between creation and the last update, never negative", () => {
    expect(sequenceFrom("2026-06-01T10:00:00Z", "2026-06-01T10:00:09.900Z")).toBe(9);
    expect(sequenceFrom("2026-06-01T10:00:00Z", "2026-06-01T09:00:00Z")).toBe(0);
    expect(sequenceFrom(undefined, "2026-06-01T09:00:00Z")).toBe(0);
    expect(sequenceFrom("bad", "2026-06-01T09:00:00Z")).toBe(0);
  });
});
