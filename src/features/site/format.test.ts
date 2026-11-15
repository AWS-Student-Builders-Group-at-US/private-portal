import { describe, expect, it } from "vitest";
import { eventSchedule, initials } from "./format";

describe("eventSchedule", () => {
  it("formats the date and start time in Madrid time", () => {
    // 17:00 UTC on 20 Nov 2026 is 18:00 in Madrid (CET, UTC+1).
    expect(eventSchedule("2026-11-20T17:00:00Z", null)).toEqual({
      date: "Viernes, 20 de noviembre",
      time: "18:00",
    });
  });

  it("adds the end time when there is one", () => {
    // Summer time (CEST, UTC+2).
    expect(eventSchedule("2026-07-15T17:00:00Z", "2026-07-15T19:30:00Z")).toEqual({
      date: "Miércoles, 15 de julio",
      time: "19:00 – 21:30",
    });
  });
});

describe("initials", () => {
  it("takes the first letter of the first two words, upper-cased", () => {
    expect(initials("Guille")).toBe("G");
    expect(initials("josé maría")).toBe("JM");
    expect(initials("  Iván  de la Torre ")).toBe("ID");
  });

  it("returns an empty string for blank names", () => {
    expect(initials("   ")).toBe("");
  });
});
