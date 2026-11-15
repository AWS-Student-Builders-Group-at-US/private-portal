import { describe, expect, it } from "vitest";
import { resolveFolderPath, type FolderNode } from "./ancestry";

// Fake Drive tree: root > a > b > c ; outside > x ; loop1 <-> loop2
const NODES: Record<string, FolderNode> = {
  root: { id: "root", name: "Raíz", parents: [] },
  a: { id: "a", name: "A", parents: ["root"] },
  b: { id: "b", name: "B", parents: ["a"] },
  c: { id: "c", name: "C", parents: ["b"] },
  outside: { id: "outside", name: "Fuera", parents: [] },
  x: { id: "x", name: "X", parents: ["outside"] },
  loop1: { id: "loop1", name: "L1", parents: ["loop2"] },
  loop2: { id: "loop2", name: "L2", parents: ["loop1"] },
};
const lookup = async (id: string) => NODES[id] ?? null;

describe("resolveFolderPath", () => {
  it("returns just the root for the root itself", async () => {
    expect(await resolveFolderPath("root", "root", lookup)).toEqual([{ id: "root", name: "Raíz" }]);
  });

  it("accepts a direct child", async () => {
    expect(await resolveFolderPath("a", "root", lookup)).toEqual([
      { id: "root", name: "Raíz" },
      { id: "a", name: "A" },
    ]);
  });

  it("accepts a nested descendant and orders the breadcrumbs from the root", async () => {
    const path = await resolveFolderPath("c", "root", lookup);
    expect(path?.map((node) => node.id)).toEqual(["root", "a", "b", "c"]);
  });

  it("rejects folders outside the root", async () => {
    expect(await resolveFolderPath("x", "root", lookup)).toBeNull();
  });

  it("rejects unknown folders", async () => {
    expect(await resolveFolderPath("missing", "root", lookup)).toBeNull();
  });

  it("stops on cycles", async () => {
    expect(await resolveFolderPath("loop1", "root", lookup)).toBeNull();
  });

  it("stops at the depth limit", async () => {
    expect(await resolveFolderPath("c", "root", lookup, 2)).toBeNull();
    expect(await resolveFolderPath("c", "root", lookup, 3)).not.toBeNull();
  });

  it("follows any of several parents", async () => {
    const multi = async (id: string) =>
      id === "m" ? { id: "m", name: "M", parents: ["outside", "a"] } : lookup(id);
    const path = await resolveFolderPath("m", "root", multi);
    expect(path?.map((node) => node.id)).toEqual(["root", "a", "m"]);
  });
});
