import { describe, expect, it } from "vitest";
import { eventFormSchema } from "./schema";

const valid = {
  title: "  Introducción a AWS  ",
  description: "Primera charla del curso.",
  starts_at: "2026-11-20T18:00",
  ends_at: "2026-11-20T20:00",
  location: "Aula A0.10",
  meetup_url: "https://www.meetup.com/example-group/events/123/",
  expected_attendees: "40",
  is_public: "on",
};

function issuePaths(input: Record<string, unknown>) {
  const result = eventFormSchema.safeParse(input);
  expect(result.success).toBe(false);
  return result.error!.issues.map((issue) => issue.path.join("."));
}

describe("eventFormSchema", () => {
  it("parses a valid event into a database row (UTC times)", () => {
    const result = eventFormSchema.safeParse(valid);
    expect(result.success).toBe(true);
    expect(result.data).toEqual({
      title: "Introducción a AWS",
      description: "Primera charla del curso.",
      starts_at: "2026-11-20T17:00:00.000Z",
      ends_at: "2026-11-20T19:00:00.000Z",
      location: "Aula A0.10",
      meetup_url: "https://www.meetup.com/example-group/events/123/",
      expected_attendees: 40,
      is_public: true,
    });
  });

  it("requires a title", () => {
    expect(issuePaths({ ...valid, title: "   " })).toContain("title");
  });

  it("rejects an end before the start", () => {
    expect(
      issuePaths({ ...valid, ends_at: "2026-11-20T17:59" }),
    ).toContain("ends_at");
  });

  it("reports an invalid start date instead of throwing", () => {
    expect(issuePaths({ ...valid, starts_at: "2026-13-01T10:00" })).toContain(
      "starts_at",
    );
  });

  it("rejects negative expected attendees", () => {
    expect(issuePaths({ ...valid, expected_attendees: "-1" })).toContain(
      "expected_attendees",
    );
  });

  it("rejects an invalid Meetup URL", () => {
    expect(issuePaths({ ...valid, meetup_url: "not a url" })).toContain(
      "meetup_url",
    );
    expect(
      issuePaths({ ...valid, meetup_url: "javascript:alert(1)" }),
    ).toContain("meetup_url");
  });

  it("turns empty optional fields into null", () => {
    const result = eventFormSchema.safeParse({
      title: "Reunión",
      description: "",
      starts_at: "2026-11-20T18:00",
      ends_at: "",
      location: " ",
      meetup_url: "",
      expected_attendees: "",
    });
    expect(result.success).toBe(true);
    expect(result.data).toEqual({
      title: "Reunión",
      description: null,
      starts_at: "2026-11-20T17:00:00.000Z",
      ends_at: null,
      location: null,
      meetup_url: null,
      expected_attendees: null,
      is_public: false,
    });
  });
});
