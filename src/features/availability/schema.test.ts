import { describe, expect, it } from "vitest";
import { overrideFormSchema, templateRangesSchema } from "./schema";

const valid = {
  date: "2026-11-20",
  start_time: "10:00",
  end_time: "12:30",
  kind: "busy",
};

function issuePaths(input: Record<string, unknown>) {
  const result = overrideFormSchema.safeParse(input);
  expect(result.success).toBe(false);
  return result.error!.issues.map((issue) => issue.path.join("."));
}

describe("overrideFormSchema", () => {
  it("parses a valid override", () => {
    expect(overrideFormSchema.parse(valid)).toEqual(valid);
  });

  it("rejects an impossible date", () => {
    expect(issuePaths({ ...valid, date: "2026-02-30" })).toContain("date");
  });

  it("rejects malformed times", () => {
    expect(issuePaths({ ...valid, start_time: "25:00" })).toContain("start_time");
    expect(issuePaths({ ...valid, end_time: "9" })).toContain("end_time");
  });

  it("requires the end after the start", () => {
    expect(issuePaths({ ...valid, end_time: "10:00" })).toContain("end_time");
  });

  it("rejects an unknown kind", () => {
    expect(issuePaths({ ...valid, kind: "maybe" })).toContain("kind");
  });
});

describe("templateRangesSchema", () => {
  it("accepts ranges on the grid", () => {
    const ranges = [{ weekday: 0, start_time: "10:00", end_time: "11:00" }];
    expect(templateRangesSchema.parse(ranges)).toEqual(ranges);
  });

  it("rejects bad weekdays and inverted ranges", () => {
    expect(
      templateRangesSchema.safeParse([
        { weekday: 7, start_time: "10:00", end_time: "11:00" },
      ]).success,
    ).toBe(false);
    expect(
      templateRangesSchema.safeParse([
        { weekday: 1, start_time: "11:00", end_time: "10:00" },
      ]).success,
    ).toBe(false);
  });
});
