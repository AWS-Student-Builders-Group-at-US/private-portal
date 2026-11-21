import { ZERNIO_ID } from "./envelope";

// Pure mapping from a Zernio analytics item (`GET /v1/analytics`, see
// https://docs.zernio.com/analytics/get-analytics) to a `post_metrics` row,
// plus the aggregates the panel shows. Only posts created through Zernio are
// kept (matched by `latePostId`); posts made outside Zernio are skipped.

export const METRIC_KEYS = ["impressions", "reach", "likes", "comments", "shares", "saves", "clicks", "views"] as const;
export type MetricKey = (typeof METRIC_KEYS)[number];
export type PostMetricsValues = Record<MetricKey, number>;

export type SyncStatus = "synced" | "pending" | "partial" | "unavailable";
const SYNC_STATUSES: readonly SyncStatus[] = ["synced", "pending", "partial", "unavailable"];

export type PlatformMetrics = PostMetricsValues & { platform: string; engagement_rate: number | null };

export type PostMetricsRow = PostMetricsValues & {
  zernio_post_id: string;
  engagement_rate: number | null;
  sync_status: SyncStatus;
  metrics_updated_at: string | null;
  platforms: PlatformMetrics[];
};

type Json = Record<string, unknown>;
const isObject = (value: unknown): value is Json =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const PLATFORM = /^[a-z0-9_-]{1,40}$/;
const MAX_COUNT = 2_000_000_000; // fits a Postgres integer

const count = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) && value > 0 ? Math.min(Math.round(value), MAX_COUNT) : 0;

const rate = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) && value >= 0 ? Math.round(value * 100) / 100 : null;

const isoDate = (value: unknown) => {
  if (typeof value !== "string") return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

function values(analytics: unknown): PostMetricsValues {
  const source = isObject(analytics) ? analytics : {};
  return Object.fromEntries(METRIC_KEYS.map((k) => [k, count(source[k])])) as PostMetricsValues;
}

function zernioId(item: Json): string | null {
  const candidates = [item.latePostId, ...(item.isExternal === true ? [] : [item.postId, item._id])];
  for (const candidate of candidates) {
    if (candidate === null || candidate === undefined) continue;
    return typeof candidate === "string" && ZERNIO_ID.test(candidate) ? candidate : null;
  }
  return null;
}

function platformMetrics(entry: unknown): PlatformMetrics | null {
  if (!isObject(entry) || entry.status === "failed" || !isObject(entry.analytics)) return null;
  const platform = typeof entry.platform === "string" ? entry.platform.toLowerCase() : "";
  if (!PLATFORM.test(platform)) return null;
  return { platform, ...values(entry.analytics), engagement_rate: rate(entry.analytics.engagementRate) };
}

export function mapPostAnalytics(item: unknown): PostMetricsRow | null {
  if (!isObject(item)) return null;
  const zernio_post_id = zernioId(item);
  if (!zernio_post_id) return null;
  const analytics = isObject(item.analytics) ? item.analytics : {};
  const status = SYNC_STATUSES.find((s) => s === item.syncStatus) ?? "pending";
  const platforms = Array.isArray(item.platformAnalytics)
    ? item.platformAnalytics.map(platformMetrics).filter((p): p is PlatformMetrics => p !== null)
    : [];
  return {
    zernio_post_id,
    ...values(analytics),
    engagement_rate: rate(analytics.engagementRate),
    sync_status: status,
    metrics_updated_at: isoDate(analytics.lastUpdated),
    platforms,
  };
}

/** Interactions as Zernio counts them for the engagement rate (clicks excluded). */
export const interactionsOf = (m: PostMetricsValues) => m.likes + m.comments + m.shares + m.saves;

export type MetricsSummary = {
  posts: number;
  impressions: number;
  reach: number;
  interactions: number;
  engagementRate: number | null;
};

/**
 * Totals over several posts. The engagement rate follows Zernio's own rule
 * per post (basis = first non-zero of impressions, reach, views) and sums
 * both sides, so it is weighted by audience instead of averaging rates.
 */
export function summarizeMetrics(rows: PostMetricsValues[]): MetricsSummary {
  let impressions = 0;
  let reach = 0;
  let interactions = 0;
  let engaged = 0;
  let basis = 0;
  for (const row of rows) {
    const own = interactionsOf(row);
    impressions += row.impressions;
    reach += row.reach;
    interactions += own;
    const base = row.impressions || row.reach || row.views;
    if (base > 0) {
      engaged += own;
      basis += base;
    }
  }
  return {
    posts: rows.length,
    impressions,
    reach,
    interactions,
    engagementRate: basis > 0 ? Math.round((engaged / basis) * 10000) / 100 : null,
  };
}

const compact = new Intl.NumberFormat("es-ES", { notation: "compact", maximumFractionDigits: 1 });
const full = new Intl.NumberFormat("es-ES");

export const formatCount = (n: number) => (n >= 10_000 ? compact.format(n) : full.format(n));

export const formatRate = (r: number | null) =>
  r === null ? "—" : `${new Intl.NumberFormat("es-ES", { maximumFractionDigits: 2 }).format(r)} %`;
