import { describe, expect, it } from "vitest";
import { manualEditSchema, manualRows, noteFormSchema, noteTextSchema } from "./schema";

// Form values arrive as strings (FormData).
const valid = {
  start_date: "2026-11-17",
  end_date: "2026-11-18",
  start_minute: "600",
  end_minute: "720",
  title: "No puedo presencial",
  body: "Solo online esa semana.",
};

function issuePaths(input: Record<string, unknown>) {
  const result = noteFormSchema.safeParse(input);
  expect(result.success).toBe(false);
  return result.error!.issues.map((issue) => issue.path.join("."));
}

describe("noteFormSchema", () => {
  it("parses a valid rectangle and coerces minutes to numbers", () => {
    expect(noteFormSchema.parse(valid)).toEqual({
      ...valid,
      start_minute: 600,
      end_minute: 720,
    });
  });

  it("trims the text and defaults an empty body", () => {
    const parsed = noteFormSchema.parse({ ...valid, title: "  Viaje  ", body: undefined });
    expect(parsed.title).toBe("Viaje");
    expect(parsed.body).toBe("");
  });

  it("accepts a one-day, one-slot note", () => {
    const parsed = noteFormSchema.parse({
      ...valid,
      end_date: valid.start_date,
      start_minute: "1290",
      end_minute: "1320",
    });
    expect(parsed.end_minute - parsed.start_minute).toBe(30);
  });

  it("rejects impossible dates and an end date before the start", () => {
    expect(issuePaths({ ...valid, start_date: "2026-02-30" })).toContain("start_date");
    expect(issuePaths({ ...valid, end_date: "2026-11-16" })).toContain("end_date");
  });

  it("rejects ranges longer than 31 days", () => {
    expect(issuePaths({ ...valid, end_date: "2026-12-19" })).toContain("end_date");
  });

  it("rejects minutes off the grid, outside it, or inverted", () => {
    expect(issuePaths({ ...valid, start_minute: "610" })).toContain("start_minute");
    expect(issuePaths({ ...valid, start_minute: "420" })).toContain("start_minute");
    expect(issuePaths({ ...valid, end_minute: "1350" })).toContain("end_minute");
    expect(issuePaths({ ...valid, end_minute: "600" })).toContain("end_minute");
    expect(issuePaths({ ...valid, start_minute: "abc" })).toContain("start_minute");
  });

  it("requires a title of at most 120 characters", () => {
    expect(issuePaths({ ...valid, title: "   " })).toContain("title");
    expect(issuePaths({ ...valid, title: "x".repeat(121) })).toContain("title");
    expect(noteFormSchema.safeParse({ ...valid, title: "x".repeat(120) }).success).toBe(true);
  });

  it("limits the content to 2000 characters", () => {
    expect(issuePaths({ ...valid, body: "x".repeat(2001) })).toContain("body");
    expect(noteFormSchema.safeParse({ ...valid, body: "x".repeat(2000) }).success).toBe(true);
  });
});

describe("noteTextSchema", () => {
  it("validates only the title and content of an edit", () => {
    expect(noteTextSchema.parse({ title: " Viaje ", body: "" })).toEqual({
      title: "Viaje",
      body: "",
    });
    expect(noteTextSchema.safeParse({ title: "", body: "" }).success).toBe(false);
  });
});

describe("manualEditSchema", () => {
  const edit = {
    start_date: "2026-11-17",
    end_date: "2026-11-18",
    start_minute: 600,
    end_minute: 660,
    choice: "0.5",
  };

  it("accepts a rectangle of the grid and a choice", () => {
    expect(manualEditSchema.safeParse(edit).success).toBe(true);
    expect(manualEditSchema.safeParse({ ...edit, choice: "google" }).success).toBe(true);
  });

  it("rejects unknown choices, reversed ranges and more than a week", () => {
    expect(manualEditSchema.safeParse({ ...edit, choice: "2" }).success).toBe(false);
    expect(manualEditSchema.safeParse({ ...edit, end_minute: 600 }).success).toBe(false);
    expect(manualEditSchema.safeParse({ ...edit, end_date: "2026-11-16" }).success).toBe(false);
    expect(manualEditSchema.safeParse({ ...edit, end_date: "2026-11-24" }).success).toBe(false);
    expect(manualEditSchema.safeParse({ ...edit, start_minute: 615 }).success).toBe(false);
  });

  it("builds one row per date and 30-minute slot", () => {
    const parsed = manualEditSchema.parse(edit);
    expect(manualRows(parsed, "a@example.com", 0.5)).toEqual([
      { member_email: "a@example.com", date: "2026-11-17", start_minute: 600, value: 0.5 },
      { member_email: "a@example.com", date: "2026-11-17", start_minute: 630, value: 0.5 },
      { member_email: "a@example.com", date: "2026-11-18", start_minute: 600, value: 0.5 },
      { member_email: "a@example.com", date: "2026-11-18", start_minute: 630, value: 0.5 },
    ]);
  });
});
