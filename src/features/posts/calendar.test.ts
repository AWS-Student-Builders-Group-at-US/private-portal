import { describe, expect, it } from "vitest";
import { monthGrid, parseMonth, shiftMonth } from "./calendar";

describe("monthGrid", () => {
  it("covers whole Monday-first weeks around the month", () => {
    const weeks = monthGrid("2026-11");
    expect(weeks[0][0]).toBe("2026-10-26"); // Monday before 1 Nov (Sunday)
    expect(weeks.at(-1)!.at(-1)).toBe("2026-12-06");
    expect(weeks.every((w) => w.length === 7)).toBe(true);
    expect(weeks).toHaveLength(6);
  });
});

describe("parseMonth / shiftMonth", () => {
  it("validates ?mes= and falls back", () => {
    expect(parseMonth("2026-02", "2026-11")).toBe("2026-02");
    expect(parseMonth("2026-13", "2026-11")).toBe("2026-11");
    expect(parseMonth(undefined, "2026-11")).toBe("2026-11");
  });

  it("moves across years", () => {
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
  });
});
