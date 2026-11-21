import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { mapPostAnalytics, type PostMetricsRow } from "./analytics";
import { listPostAnalytics, ZernioApiError } from "./client";

// Server-only sync of post insights from Zernio into public.post_metrics with
// the secret-key client. Callers: the daily cron, the member-only "sync now"
// action and the `analytics.synced` webhook. Pages only read the table, so
// rendering never calls Zernio.

export type MetricsSyncResult = {
  updated: number;
  ok: boolean;
  /** The Zernio plan lacks the Analytics add-on (HTTP 402). */
  addonRequired: boolean;
};

const DAY_MS = 24 * 60 * 60 * 1000;
// Zernio's own default window; older posts keep their last stored numbers.
const LOOKBACK_DAYS = 90;
const PAGE_SIZE = 50;
const MAX_PAGES = 6;

async function collect(): Promise<PostMetricsRow[]> {
  const fromDate = new Date(Date.now() - LOOKBACK_DAYS * DAY_MS);
  const rows = new Map<string, PostMetricsRow>();
  for (let page = 1; page <= MAX_PAGES; page++) {
    const { items, hasMore } = await listPostAnalytics({ fromDate, page, limit: PAGE_SIZE });
    for (const item of items) {
      const row = mapPostAnalytics(item);
      if (row && !rows.has(row.zernio_post_id)) rows.set(row.zernio_post_id, row);
    }
    if (!hasMore) break;
  }
  return [...rows.values()];
}

/** Stores the latest insights of every Zernio post. Never throws. */
export async function syncPostMetrics(): Promise<MetricsSyncResult> {
  const result: MetricsSyncResult = { updated: 0, ok: true, addonRequired: false };
  try {
    const rows = await collect();
    if (rows.length === 0) return result;
    const admin = createAdminClient();
    const { data: posts, error: readError } = await admin
      .from("posts")
      .select("id, zernio_post_id")
      .in("zernio_post_id", rows.map((r) => r.zernio_post_id));
    if (readError) return { ...result, ok: false };

    const postIds = new Map((posts ?? []).map((p) => [p.zernio_post_id as string, p.id as string]));
    const fetched_at = new Date().toISOString();
    const upserts = rows.flatMap(({ zernio_post_id, ...metrics }) => {
      const post_id = postIds.get(zernio_post_id);
      return post_id ? [{ post_id, ...metrics, fetched_at }] : [];
    });
    if (upserts.length === 0) return result;
    const { error } = await admin.from("post_metrics").upsert(upserts, { onConflict: "post_id" });
    if (error) return { ...result, ok: false };
    result.updated = upserts.length;
  } catch (error) {
    result.ok = false;
    result.addonRequired = error instanceof ZernioApiError && error.status === 402;
  }
  return result;
}
