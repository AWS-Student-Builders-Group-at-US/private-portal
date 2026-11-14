import { describe, expect, it } from "vitest";
import { parseStatusFilter, sortSuggestions } from "./logic";
import { suggestionFormSchema, suggestionStatusSchema } from "./schema";

describe("suggestionFormSchema", () => {
  it("parses a signed suggestion", () => {
    expect(suggestionFormSchema.parse({ body: "  Hacer un taller de Lambda  " })).toEqual({
      body: "Hacer un taller de Lambda",
      anonymous: false,
    });
  });

  it("marks anonymous suggestions", () => {
    expect(suggestionFormSchema.parse({ body: "Idea", anonymous: "on" }).anonymous).toBe(true);
  });

  it("requires text and limits its length", () => {
    expect(suggestionFormSchema.safeParse({ body: "  " }).success).toBe(false);
    expect(suggestionFormSchema.safeParse({ body: "a".repeat(2001) }).success).toBe(false);
  });

  it("accepts only the three statuses", () => {
    expect(suggestionStatusSchema.safeParse("aceptada").success).toBe(true);
    expect(suggestionStatusSchema.safeParse("archivada").success).toBe(false);
  });
});

describe("sortSuggestions", () => {
  it("orders by votes, then newest first", () => {
    const sorted = sortSuggestions([
      { id: "a", votes: 1, created_at: "2026-11-10T00:00:00Z" },
      { id: "b", votes: 3, created_at: "2026-11-01T00:00:00Z" },
      { id: "c", votes: 1, created_at: "2026-11-12T00:00:00Z" },
    ]);
    expect(sorted.map((s) => s.id)).toEqual(["b", "c", "a"]);
  });
});

describe("parseStatusFilter", () => {
  it("defaults to nueva and accepts todas", () => {
    expect(parseStatusFilter(undefined)).toBe("nueva");
    expect(parseStatusFilter("descartada")).toBe("descartada");
    expect(parseStatusFilter("todas")).toBe("todas");
    expect(parseStatusFilter("otra")).toBe("nueva");
  });
});
