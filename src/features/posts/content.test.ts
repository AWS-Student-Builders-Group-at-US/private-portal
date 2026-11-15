import { describe, expect, it } from "vitest";
import { networkWarnings, previewText, slugify } from "./content";
import { postFormSchema } from "./schema";

describe("slugify", () => {
  it("makes a URL-safe slug without accents", () => {
    expect(slugify("¡Arranca el curso 2026/27 en la ETSII!")).toBe(
      "arranca-el-curso-2026-27-en-la-etsii",
    );
    expect(slugify("  Ñandú   y   más  ")).toBe("nandu-y-mas");
  });

  it("caps the length without a trailing dash", () => {
    const slug = slugify("a".repeat(70) + " " + "b".repeat(30));
    expect(slug.length).toBeLessThanOrEqual(80);
    expect(slug.endsWith("-")).toBe(false);
  });
});

describe("previewText", () => {
  it("cuts at a word boundary with an ellipsis", () => {
    expect(previewText("Hola equipo de AWS en Sevilla", 15)).toBe("Hola equipo de…");
    expect(previewText("Corto", 15)).toBe("Corto");
  });
});

describe("networkWarnings", () => {
  it("flags Instagram without an image and long captions", () => {
    expect(networkWarnings({ body: "Hola", hasImage: false, targets: ["instagram"] })).toEqual([
      "Instagram necesita una imagen.",
    ]);
    expect(
      networkWarnings({ body: "x".repeat(2300), hasImage: true, targets: ["instagram", "linkedin"] }),
    ).toEqual(["El texto supera los 2200 caracteres de Instagram."]);
    expect(
      networkWarnings({ body: "x".repeat(3100), hasImage: true, targets: ["linkedin"] }),
    ).toEqual(["El texto supera los 3000 caracteres de LinkedIn."]);
  });
});

describe("postFormSchema", () => {
  const valid = {
    title: " Charla de Lambda ",
    slug: "",
    body: "Texto",
    targets: ["web", "linkedin"],
    scheduled_at: "2026-11-20T18:00",
    event_id: "",
    image_path: "",
  };

  it("parses a valid post and derives the slug from the title", () => {
    expect(postFormSchema.parse(valid)).toEqual({
      title: "Charla de Lambda",
      slug: "charla-de-lambda",
      body: "Texto",
      targets: ["web", "linkedin"],
      scheduled_at: "2026-11-20T17:00:00.000Z",
      event_id: null,
      image_path: null,
    });
  });

  it("requires at least one target and a known target", () => {
    expect(postFormSchema.safeParse({ ...valid, targets: [] }).success).toBe(false);
    expect(postFormSchema.safeParse({ ...valid, targets: ["tiktok"] }).success).toBe(false);
  });

  it("rejects a malformed slug and image paths outside posts/", () => {
    expect(postFormSchema.safeParse({ ...valid, slug: "Con Espacios" }).success).toBe(false);
    expect(postFormSchema.safeParse({ ...valid, image_path: "../x.png" }).success).toBe(false);
    expect(postFormSchema.parse({ ...valid, image_path: "posts/abc-foto.png" }).image_path).toBe(
      "posts/abc-foto.png",
    );
  });

  it("allows no date", () => {
    expect(postFormSchema.parse({ ...valid, scheduled_at: "" }).scheduled_at).toBeNull();
  });
});
