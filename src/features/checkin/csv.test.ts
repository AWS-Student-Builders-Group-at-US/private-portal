import { describe, expect, it } from "vitest";
import {
  ATTENDEES_CSV_HEADER,
  FORM_VERSION_HEADER,
  attendeesToCsv,
  escapeCsvField,
} from "./csv";

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
      answers: {},
      form_version: 1,
    },
  ]);

  it("starts with a UTF-8 BOM and the header row", () => {
    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv.slice(1).split("\r\n")[0]).toBe(
      [...ATTENDEES_CSV_HEADER, FORM_VERSION_HEADER].join(","),
    );
  });

  it("writes one escaped row per attendee with Madrid time", () => {
    const rows = csv.slice(1).split("\r\n");
    expect(rows[1]).toBe(
      '"Pérez, ""Ana""",ana@example.com,sí,no,2026-11-20 18:05,1',
    );
  });
});

describe("attendeesToCsv with extra answers", () => {
  const base = {
    email: "x@example.com",
    photo_consent: false,
    email_consent: true,
    checked_in_at: "2026-11-20T17:05:00.000Z",
  };
  const csv = attendeesToCsv(
    [
      { ...base, name: "Ana", answers: { degree: "=cmd", news: true }, form_version: 2 },
      { ...base, name: "Luis", answers: { course: "2º" }, form_version: null },
    ],
    { degree: "Titulación, grado", course: "Curso" },
  );
  const rows = csv.slice(1).split("\r\n");

  it("adds one column per extra key, labelled from the definitions", () => {
    expect(rows[0]).toBe(
      [
        ...ATTENDEES_CSV_HEADER,
        '"Titulación, grado"',
        "news",
        "Curso",
        FORM_VERSION_HEADER,
      ].join(","),
    );
  });

  it("fills missing answers with blanks and neutralises formulas", () => {
    expect(rows[1].endsWith(",'=cmd,sí,,2")).toBe(true);
    expect(rows[2].endsWith(",,,2º,")).toBe(true);
  });
});
