import { describe, expect, it } from "vitest";
import { groupBy } from "./group";

describe("groupBy", () => {
  it("groups items by key in order of first appearance, keeping item order", () => {
    const items = [
      { day: "b", n: 1 },
      { day: "a", n: 2 },
      { day: "b", n: 3 },
    ];
    expect(groupBy(items, (item) => item.day)).toEqual([
      { key: "b", items: [items[0], items[2]] },
      { key: "a", items: [items[1]] },
    ]);
  });

  it("returns no groups for no items", () => {
    expect(groupBy([], () => "x")).toEqual([]);
  });

  it("supports null keys", () => {
    const groups = groupBy([1, 2, 3], (n) => (n === 2 ? null : "odd"));
    expect(groups).toEqual([
      { key: "odd", items: [1, 3] },
      { key: null, items: [2] },
    ]);
  });
});
