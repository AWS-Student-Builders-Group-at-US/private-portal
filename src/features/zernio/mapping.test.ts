import { describe, expect, it } from "vitest";
import { buildSlug, deriveTitle, mapZernioPost, platformUrls, safePlatformUrl } from "./mapping";

const NOW = new Date("2026-11-15T10:00:00.000Z");
const ID = "65f1a2b3c4d5e6f7a8b9c0d1";

describe("deriveTitle", () => {
  it("uses the first non-empty line", () => {
    expect(deriveTitle("\n\n  Taller de Lambda  \nSegunda línea")).toBe("Taller de Lambda");
  });

  it("strips trailing hashtags and URLs", () => {
    expect(deriveTitle("Nuevo evento en la ETSII #AWS #cloud https://example.com/x")).toBe(
      "Nuevo evento en la ETSII",
    );
  });

  it("skips lines made only of hashtags or links", () => {
    expect(deriveTitle("#AWS #US\nhttps://x.com\nCharla de Bedrock")).toBe("Charla de Bedrock");
  });

  it("caps the title at 120 characters", () => {
    const title = deriveTitle(`${"palabra ".repeat(40)}final`);
    expect(title.length).toBeLessThanOrEqual(120);
    expect(title.endsWith("…")).toBe(true);
  });

  it("falls back to «Publicación»", () => {
    expect(deriveTitle("")).toBe("Publicación");
    expect(deriveTitle(null)).toBe("Publicación");
    expect(deriveTitle("#solo #hashtags")).toBe("Publicación");
  });
});

describe("buildSlug", () => {
  it("is the slugified title plus a stable suffix from the Zernio id", () => {
    expect(buildSlug("Taller de Lambda", ID)).toBe("taller-de-lambda-a8b9c0d1");
    expect(buildSlug("Taller de Lambda", ID)).toBe(buildSlug("Taller de Lambda", ID));
  });

  it("stays within 80 characters and matches the slug pattern", () => {
    const slug = buildSlug("Una publicación con un título larguísimo ".repeat(4), ID);
    expect(slug.length).toBeLessThanOrEqual(80);
    expect(slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    expect(slug.endsWith("-a8b9c0d1")).toBe(true);
  });

  it("uses «publicacion» when the title has no slug characters", () => {
    expect(buildSlug("🎉🎉", "AB_cd-12")).toBe("publicacion-abcd12");
  });
});

describe("safePlatformUrl", () => {
  it("accepts https links on the platform's own host", () => {
    expect(safePlatformUrl("instagram", "https://www.instagram.com/p/abc/")).toBe("https://www.instagram.com/p/abc/");
    expect(safePlatformUrl("linkedin", "https://www.linkedin.com/feed/update/urn:li:share:1")).toBe(
      "https://www.linkedin.com/feed/update/urn:li:share:1",
    );
    expect(safePlatformUrl("instagram", "https://instagram.com/p/x")).toBe("https://instagram.com/p/x");
  });

  it("rejects http, other hosts, look-alike hosts and the wrong platform", () => {
    expect(safePlatformUrl("instagram", "http://www.instagram.com/p/abc/")).toBeNull();
    expect(safePlatformUrl("instagram", "https://evil.com/instagram.com")).toBeNull();
    expect(safePlatformUrl("instagram", "https://instagram.com.evil.com/p")).toBeNull();
    expect(safePlatformUrl("instagram", "https://notinstagram.com/p")).toBeNull();
    expect(safePlatformUrl("linkedin", "https://www.instagram.com/p/abc/")).toBeNull();
    expect(safePlatformUrl("twitter", "https://x.com/a")).toBeNull();
    expect(safePlatformUrl("instagram", "javascript:alert(1)")).toBeNull();
    expect(safePlatformUrl("instagram", null)).toBeNull();
  });
});

describe("platformUrls", () => {
  it("keeps one allowed URL per platform", () => {
    expect(
      platformUrls([
        { platform: "instagram", platformPostUrl: "https://www.instagram.com/p/a/" },
        { platform: "linkedin", platformPostUrl: "https://evil.com/x" },
        { platform: "twitter", platformPostUrl: "https://x.com/a" },
      ]),
    ).toEqual({ instagram: "https://www.instagram.com/p/a/" });
  });
});

describe("mapZernioPost", () => {
  const base = {
    _id: ID,
    content: "Taller de Lambda\nVen a aprender serverless. #AWS",
    scheduledFor: "2026-11-20T17:00:00.000Z",
    platforms: [
      { platform: "instagram", status: "pending" },
      { platform: "linkedin", status: "pending" },
    ],
  };

  it("maps a scheduled post to an approved row with its date", () => {
    const row = mapZernioPost({ ...base, status: "scheduled" }, NOW);
    expect(row).toMatchObject({
      zernio_post_id: ID,
      source: "zernio",
      created_by: "zernio",
      title: "Taller de Lambda",
      slug: "taller-de-lambda-a8b9c0d1",
      body: base.content,
      targets: ["linkedin", "instagram"],
      status: "approved",
      scheduled_at: "2026-11-20T17:00:00.000Z",
      published_at: null,
      platform_urls: {},
      publish_error: null,
    });
  });

  it("never targets the web and ignores unsupported platforms", () => {
    const row = mapZernioPost(
      { ...base, status: "scheduled", platforms: [{ platform: "twitter" }, { platform: "instagram" }] },
      NOW,
    );
    expect(row?.targets).toEqual(["instagram"]);
  });

  it("skips posts without an id or without Instagram/LinkedIn", () => {
    expect(mapZernioPost({ ...base, _id: undefined, status: "scheduled" }, NOW)).toBeNull();
    expect(mapZernioPost({ ...base, status: "scheduled", platforms: [{ platform: "tiktok" }] }, NOW)).toBeNull();
  });

  it("maps published and partial posts with a published platform to published", () => {
    const published = mapZernioPost(
      {
        ...base,
        status: "partial",
        platforms: [
          {
            platform: "instagram",
            status: "published",
            publishedAt: "2026-11-20T17:01:00.000Z",
            platformPostUrl: "https://www.instagram.com/p/abc/",
          },
          { platform: "linkedin", status: "failed" },
        ],
      },
      NOW,
    );
    expect(published).toMatchObject({
      status: "published",
      published_at: "2026-11-20T17:01:00.000Z",
      platform_urls: { instagram: "https://www.instagram.com/p/abc/" },
    });
  });

  it("uses now when a published post carries no date", () => {
    const row = mapZernioPost(
      { _id: ID, content: "Hola", status: "published", platforms: [{ platform: "linkedin" }] },
      NOW,
    );
    expect(row).toMatchObject({ status: "published", published_at: NOW.toISOString() });
  });

  it("keeps partial posts with nothing published out of the site", () => {
    const row = mapZernioPost(
      { ...base, status: "partial", platforms: [{ platform: "instagram", status: "failed" }] },
      NOW,
    );
    expect(row?.status).toBe("draft");
  });

  it("maps failed posts to drafts with an error, and drafts or cancelled posts to drafts", () => {
    expect(mapZernioPost({ ...base, status: "failed" }, NOW)).toMatchObject({
      status: "draft",
      publish_error: "La publicación falló en Zernio.",
      published_at: null,
    });
    expect(mapZernioPost({ ...base, status: "cancelled" }, NOW)).toMatchObject({ status: "draft", publish_error: null });
    expect(mapZernioPost({ ...base, status: "draft" }, NOW)?.status).toBe("draft");
  });

  it("uses the title as body for posts without text and truncates long bodies", () => {
    expect(mapZernioPost({ ...base, content: "", status: "scheduled" }, NOW)?.body).toBe("Publicación");
    expect(mapZernioPost({ ...base, content: "a".repeat(12000), status: "scheduled" }, NOW)?.body.length).toBe(10000);
  });

  it("ignores invalid dates", () => {
    expect(mapZernioPost({ ...base, status: "scheduled", scheduledFor: "nope" }, NOW)?.scheduled_at).toBeNull();
  });

  it("returns the first image of the media items", () => {
    const row = mapZernioPost(
      {
        ...base,
        status: "scheduled",
        mediaItems: [
          { type: "video", url: "https://cdn.example.com/v.mp4" },
          { type: "image", url: "https://cdn.example.com/a.jpg" },
        ],
      },
      NOW,
    );
    expect(row?.imageUrl).toBe("https://cdn.example.com/a.jpg");
  });
});
