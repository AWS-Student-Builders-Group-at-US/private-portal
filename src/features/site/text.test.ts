import { describe, expect, it } from "vitest";
import { paragraphs, readingMinutes } from "./text";

describe("paragraphs", () => {
  it("splits on blank lines and trims", () => {
    expect(paragraphs("Uno\nsigue\n\n  Dos  \n\n\n")).toEqual(["Uno\nsigue", "Dos"]);
  });
});

describe("readingMinutes", () => {
  it("rounds up at ~200 words per minute, minimum 1", () => {
    expect(readingMinutes("hola")).toBe(1);
    expect(readingMinutes(Array(401).fill("p").join(" "))).toBe(3);
  });
});
