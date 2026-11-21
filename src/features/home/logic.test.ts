import { describe, expect, it } from "vitest";
import { pickNextMeeting, splitHomePosts } from "./logic";

const NOW = new Date("2026-11-22T10:00:00Z");

describe("pickNextMeeting", () => {
  const event = (id: string, starts_at: string, ends_at: string | null = null) => ({
    id,
    starts_at,
    ends_at,
  });

  it("returns the earliest event that has not finished yet", () => {
    const events = [
      event("past", "2026-11-20T18:00:00Z"),
      event("later", "2026-11-30T18:00:00Z"),
      event("soon", "2026-11-25T18:00:00Z"),
    ];
    expect(pickNextMeeting(events, NOW)?.id).toBe("soon");
  });

  it("keeps an event that is happening right now", () => {
    const events = [
      event("ongoing", "2026-11-22T09:00:00Z", "2026-11-22T11:00:00Z"),
      event("soon", "2026-11-25T18:00:00Z"),
    ];
    expect(pickNextMeeting(events, NOW)?.id).toBe("ongoing");
  });

  it("returns null when nothing is coming up", () => {
    expect(pickNextMeeting([event("past", "2026-11-01T18:00:00Z")], NOW)).toBeNull();
    expect(pickNextMeeting([], NOW)).toBeNull();
  });
});

describe("splitHomePosts", () => {
  type P = Parameters<typeof splitHomePosts>[0][number] & { id: string };
  const post = (id: string, fields: Partial<P>): P => ({
    id,
    status: "draft",
    scheduled_at: null,
    published_at: null,
    created_at: "2026-11-01T10:00:00Z",
    ...fields,
  });

  it("lists unpublished posts scheduled from now on, soonest first", () => {
    const posts = [
      post("far", { status: "approved", scheduled_at: "2026-12-10T10:00:00Z" }),
      post("near", { status: "review", scheduled_at: "2026-11-23T10:00:00Z" }),
      post("overdue", { status: "approved", scheduled_at: "2026-11-21T10:00:00Z" }),
      post("undated", { status: "draft" }),
      post("done", { status: "published", scheduled_at: "2026-11-24T10:00:00Z" }),
    ];
    expect(splitHomePosts(posts, NOW, 3).upcoming.map((p) => p.id)).toEqual(["near", "far"]);
  });

  it("lists published posts, most recent first, by publish date with fallbacks", () => {
    const posts = [
      post("old", { status: "published", published_at: "2026-10-01T10:00:00Z" }),
      post("new", { status: "published", published_at: "2026-11-20T10:00:00Z" }),
      post("scheduled-only", { status: "published", scheduled_at: "2026-11-10T10:00:00Z" }),
      post("draft", { status: "draft", scheduled_at: "2026-11-21T10:00:00Z" }),
    ];
    expect(splitHomePosts(posts, NOW, 3).recent.map((p) => p.id)).toEqual([
      "new",
      "scheduled-only",
      "old",
    ]);
  });

  it("caps both lists at the limit", () => {
    const posts = Array.from({ length: 5 }, (_, i) => [
      post(`u${i}`, { status: "approved", scheduled_at: `2026-12-0${i + 1}T10:00:00Z` }),
      post(`r${i}`, { status: "published", published_at: `2026-11-0${i + 1}T10:00:00Z` }),
    ]).flat();
    const { upcoming, recent } = splitHomePosts(posts, NOW, 2);
    expect(upcoming.map((p) => p.id)).toEqual(["u0", "u1"]);
    expect(recent.map((p) => p.id)).toEqual(["r4", "r3"]);
  });
});
