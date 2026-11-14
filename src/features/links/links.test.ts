import { describe, expect, it } from "vitest";
import { filterLinks, groupByCategory, linkCategories, parseLinkFilters } from "./filter";
import { linkFormSchema } from "./schema";

const links = [
  { id: "1", title: "Guía de AWS Educate", url: "https://aws.amazon.com/education/", category: "Formación", notes: null },
  { id: "2", title: "Drive del equipo", url: "https://drive.google.com/x", category: "Documentos", notes: "Actas y logos" },
  { id: "3", title: "Canva", url: "https://www.canva.com/", category: "Diseño", notes: "Plantillas de publicación" },
  { id: "4", title: "Meetup", url: "https://www.meetup.com/x/", category: null, notes: null },
];
const ids = (list: { id: string }[]) => list.map((l) => l.id);

describe("linkFormSchema", () => {
  it("parses a valid link and trims fields", () => {
    expect(
      linkFormSchema.parse({
        title: " Canva ",
        url: "https://www.canva.com/",
        category: " Diseño ",
        notes: "",
      }),
    ).toEqual({ title: "Canva", url: "https://www.canva.com/", category: "Diseño", notes: null });
  });

  it("requires a title and an http(s) url", () => {
    const result = linkFormSchema.safeParse({ title: "", url: "javascript:alert(1)" });
    expect(result.success).toBe(false);
    const paths = result.error!.issues.map((i) => i.path.join("."));
    expect(paths).toContain("title");
    expect(paths).toContain("url");
  });

  it("adds https:// when the protocol is missing", () => {
    expect(linkFormSchema.parse({ title: "AWS", url: "aws.amazon.com" }).url).toBe(
      "https://aws.amazon.com",
    );
  });
});

describe("filterLinks", () => {
  it("searches title, url, category and notes ignoring case and accents", () => {
    expect(ids(filterLinks(links, { q: "guia", category: null }))).toEqual(["1"]);
    expect(ids(filterLinks(links, { q: "PLANTILLAS", category: null }))).toEqual(["3"]);
    expect(ids(filterLinks(links, { q: "meetup.com", category: null }))).toEqual(["4"]);
    expect(ids(filterLinks(links, { q: "diseno", category: null }))).toEqual(["3"]);
  });

  it("filters by category, including links without one", () => {
    expect(ids(filterLinks(links, { q: "", category: "Documentos" }))).toEqual(["2"]);
    expect(ids(filterLinks(links, { q: "", category: "" }))).toEqual(["4"]);
  });

  it("returns everything without filters", () => {
    expect(ids(filterLinks(links, { q: " ", category: null }))).toEqual(["1", "2", "3", "4"]);
  });
});

describe("categories", () => {
  it("lists categories alphabetically, without duplicates or blanks", () => {
    expect(linkCategories([...links, { ...links[0], id: "5" }])).toEqual([
      "Diseño",
      "Documentos",
      "Formación",
    ]);
  });

  it("groups links by category with uncategorised last", () => {
    expect(groupByCategory(links).map(([c, l]) => [c, ids(l)])).toEqual([
      ["Diseño", ["3"]],
      ["Documentos", ["2"]],
      ["Formación", ["1"]],
      [null, ["4"]],
    ]);
  });

  it("reads ?q= and ?categoria= (sin-categoria = no category)", () => {
    expect(parseLinkFilters({ q: " aws ", categoria: "Diseño" })).toEqual({ q: "aws", category: "Diseño" });
    expect(parseLinkFilters({ categoria: "sin-categoria" })).toEqual({ q: "", category: "" });
    expect(parseLinkFilters({ q: ["a", "b"] })).toEqual({ q: "", category: null });
  });
});
