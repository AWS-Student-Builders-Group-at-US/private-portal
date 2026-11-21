import "server-only";
import { z } from "zod";
import type { PlatformMetrics, PostMetricsValues, SyncStatus } from "@/features/zernio/analytics";
import { createClient } from "@/lib/supabase/server";

// Stored Zernio insights (public.post_metrics). Reads use the user's session;
// RLS only returns rows to members. Never calls Zernio.

export type StoredPostMetrics = PostMetricsValues & {
  post_id: string;
  engagement_rate: number | null;
  platforms: PlatformMetrics[];
  sync_status: SyncStatus;
  metrics_updated_at: string | null;
  fetched_at: string;
};

const SELECT =
  "post_id, impressions, reach, likes, comments, shares, saves, clicks, views, engagement_rate, platforms, sync_status, metrics_updated_at, fetched_at";

// numeric columns come back as strings from PostgREST.
const toMetrics = (row: Record<string, unknown>): StoredPostMetrics => {
  const value = row as unknown as StoredPostMetrics;
  const rate = row.engagement_rate === null ? null : Number(row.engagement_rate);
  return {
    ...value,
    engagement_rate: rate !== null && Number.isFinite(rate) ? rate : null,
    platforms: Array.isArray(row.platforms) ? (row.platforms as PlatformMetrics[]) : [],
  };
};

export async function listPostMetrics(): Promise<Map<string, StoredPostMetrics>> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("post_metrics").select(SELECT);
  // Insights are optional: a failed read hides them instead of breaking the page.
  if (error) return new Map();
  return new Map((data ?? []).map((row) => [row.post_id as string, toMetrics(row)]));
}

export async function getPostMetrics(postId: string): Promise<StoredPostMetrics | null> {
  if (!z.uuid().safeParse(postId).success) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.from("post_metrics").select(SELECT).eq("post_id", postId).maybeSingle();
  if (error || !data) return null;
  return toMetrics(data);
}
