import { describe, expect, it } from "vitest";
import { formatCount, interactionsOf, mapPostAnalytics, summarizeMetrics, type PostMetricsValues } from "./analytics";

const ID = "65f1a2b3c4d5e6f7a8b9c0d1";
const EXTERNAL_ID = "75f1a2b3c4d5e6f7a8b9c0d2";

const metrics = {
  impressions: 15420,
  reach: 12350,
  likes: 342,
  comments: 28,
  shares: 45,
  saves: 3,
  clicks: 189,
  views: 0,
  engagementRate: 2.78,
  lastUpdated: "2026-11-10T08:30:00Z",
};

describe("mapPostAnalytics", () => {
  it("maps a Zernio post with its totals and per-platform entries", () => {
    const row = mapPostAnalytics({
      _id: EXTERNAL_ID,
      latePostId: ID,
      isExternal: false,
      syncStatus: "synced",
      analytics: metrics,
      platformAnalytics: [
        {
          platform: "instagram",
          status: "published",
          syncStatus: "synced",
          platformPostUrl: "https://www.instagram.com/p/ABC/",
          accountUsername: "someone",
          analytics: { ...metrics, likes: 300 },
        },
        { platform: "linkedin", status: "failed", analytics: null },
      ],
    });
    expect(row).toEqual({
      zernio_post_id: ID,
      impressions: 15420,
      reach: 12350,
      likes: 342,
      comments: 28,
      shares: 45,
      saves: 3,
      clicks: 189,
      views: 0,
      engagement_rate: 2.78,
      sync_status: "synced",
      metrics_updated_at: "2026-11-10T08:30:00.000Z",
      platforms: [
        {
          platform: "instagram",
          impressions: 15420,
          reach: 12350,
          likes: 300,
          comments: 28,
          shares: 45,
          saves: 3,
          clicks: 189,
          views: 0,
          engagement_rate: 2.78,
        },
      ],
    });
  });

  it("uses postId on a single-post lookup", () => {
    expect(mapPostAnalytics({ postId: ID, analytics: metrics })?.zernio_post_id).toBe(ID);
  });

  it("skips posts made outside Zernio and rows without a usable id", () => {
    expect(mapPostAnalytics({ _id: EXTERNAL_ID, isExternal: true, latePostId: null, analytics: metrics })).toBeNull();
    expect(mapPostAnalytics({ latePostId: "../etc", analytics: metrics })).toBeNull();
    expect(mapPostAnalytics(null)).toBeNull();
    expect(mapPostAnalytics([])).toBeNull();
  });

  it("coerces missing, negative or non-numeric metrics to 0 and keeps an unknown rate as null", () => {
    const row = mapPostAnalytics({
      latePostId: ID,
      syncStatus: "weird",
      analytics: { impressions: -4, reach: "12", likes: 2.6, comments: Number.NaN, engagementRate: "x", lastUpdated: "nope" },
    });
    expect(row).toMatchObject({
      impressions: 0,
      reach: 0,
      likes: 3,
      comments: 0,
      shares: 0,
      engagement_rate: null,
      sync_status: "pending",
      metrics_updated_at: null,
      platforms: [],
    });
  });

  it("accepts a post without analytics yet (sync pending)", () => {
    expect(mapPostAnalytics({ latePostId: ID, syncStatus: "pending" })).toMatchObject({
      impressions: 0,
      engagement_rate: null,
      sync_status: "pending",
    });
  });
});

const values = (over: Partial<PostMetricsValues>): PostMetricsValues => ({
  impressions: 0,
  reach: 0,
  likes: 0,
  comments: 0,
  shares: 0,
  saves: 0,
  clicks: 0,
  views: 0,
  ...over,
});

describe("interactionsOf", () => {
  it("adds likes, comments, shares and saves (never clicks)", () => {
    expect(interactionsOf(values({ likes: 10, comments: 2, shares: 3, saves: 1, clicks: 50 }))).toBe(16);
  });
});

describe("summarizeMetrics", () => {
  it("is empty without rows", () => {
    expect(summarizeMetrics([])).toEqual({ posts: 0, impressions: 0, reach: 0, interactions: 0, engagementRate: null });
  });

  it("adds totals and weights the engagement rate by each post's first non-zero basis", () => {
    const summary = summarizeMetrics([
      values({ impressions: 1000, reach: 800, likes: 40, comments: 10 }),
      values({ reach: 500, likes: 25 }), // basis: reach
      values({ views: 0, likes: 5 }), // no basis: left out of the rate
    ]);
    expect(summary).toEqual({
      posts: 3,
      impressions: 1000,
      reach: 1300,
      interactions: 80,
      engagementRate: 5, // (50 + 25) / (1000 + 500) * 100
    });
  });
});

describe("formatCount", () => {
  it("prints small numbers in full and large ones compact, in Spanish", () => {
    expect(formatCount(0)).toBe("0");
    expect(formatCount(950)).toBe("950");
    expect(formatCount(15420)).toMatch(/^15,4\s?mil$/);
  });
});
