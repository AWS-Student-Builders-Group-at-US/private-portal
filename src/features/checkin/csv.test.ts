import { describe, expect, it } from "vitest";
import { ATTENDEES_CSV_HEADER, attendeesToCsv, escapeCsvField } from "./csv";

describe("escapeCsvField", () => {
  it("leaves plain values untouched", () => {
    expect(escapeCsvField("Ana Pérez")).toBe("Ana Pérez");
  });

  it("quotes commas, quotes and newlines", () => {
    expect(escapeCsvField("Pérez, Ana")).toBe('"Pérez, Ana"');
    expect(escapeCsvField('Ana "la jefa"')).toBe('"Ana ""la jefa"""');
    expect(escapeCsvField("Ana\nPérez")).toBe('"Ana\nPérez"');
    expect(escapeCsvField("Ana\r\nPérez")).toBe('"Ana\r\nPérez"');
  });

  it("neutralises spreadsheet formulas", () => {
    expect(escapeCsvField("=HYPERLINK(1)")).toBe("'=HYPERLINK(1)");
    expect(escapeCsvField("+34")).toBe("'+34");
    expect(escapeCsvField("@cmd")).toBe("'@cmd");
  });
});

describe("attendeesToCsv", () => {
  const csv = attendeesToCsv([
    {
      name: 'Pérez, "Ana"',
      email: "ana@example.com",
      photo_consent: true,
      email_consent: false,
      checked_in_at: "2026-11-20T17:05:00.000Z",
    },
  ]);

  it("starts with a UTF-8 BOM and the header row", () => {
    expect(csv.startsWith("﻿")).toBe(true);
    expect(csv.slice(1).split("\r\n")[0]).toBe(ATTENDEES_CSV_HEADER.join(","));
  });

  it("writes one escaped row per attendee with Madrid time", () => {
    const rows = csv.slice(1).split("\r\n");
    expect(rows[1]).toBe(
      '"Pérez, ""Ana""",ana@example.com,sí,no,2026-11-20 18:05',
    );
  });
});
