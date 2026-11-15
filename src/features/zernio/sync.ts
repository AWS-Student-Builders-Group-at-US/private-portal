import "server-only";
import { revalidateTag } from "next/cache";
import { NEWS_TAG } from "@/features/site/queries";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPost, listPosts } from "./client";
import { ZERNIO_ID } from "./envelope";
import { mapZernioPost, type ZernioPost } from "./mapping";
import { copyZernioImage } from "./media";

// Server-only sync from Zernio into public.posts with the secret-key client
// (Zernio rows are server-owned; the trigger trusts JWT-less writes on them).
// Callers: the webhook, the daily cron and the member-only "sync now" action.

export type SyncResult = "synced" | "skipped" | "failed";

const MAX_PAGES = 10;

async function upsertPost(post: ZernioPost): Promise<SyncResult> {
  const mapped = mapZernioPost(post);
  if (!mapped) return "skipped";
  const { imageUrl, ...row } = mapped;
  const admin = createAdminClient();

  const { data: existing, error: readError } = await admin
    .from("posts")
    .select("id, slug, image_path")
    .eq("zernio_post_id", row.zernio_post_id)
    .maybeSingle();
  if (readError) return "failed";

  const image_path = imageUrl
    ? ((await copyZernioImage(admin, row.zernio_post_id, imageUrl)) ?? existing?.image_path ?? null)
    : null;

  if (existing) {
    // Keep the slug (stable public URL) and show_on_site (chosen by members).
    const { slug: _slug, ...update } = row;
    void _slug;
    const { error } = await admin.from("posts").update({ ...update, image_path }).eq("id", existing.id);
    return error ? "failed" : "synced";
  }
  const { error } = await admin.from("posts").insert({ ...row, image_path });
  if (error?.code === "23505") {
    // Slug taken by another post: fall back to the Zernio id alone.
    const retry = await admin
      .from("posts")
      .insert({ ...row, image_path, slug: `zernio-${row.zernio_post_id.toLowerCase().replace(/[^a-z0-9]/g, "")}` });
    return retry.error ? "failed" : "synced";
  }
  return error ? "failed" : "synced";
}

const refreshNews = () => revalidateTag(NEWS_TAG, "max");

/** Fetches one post from the API and upserts it. Never throws. */
export async function syncZernioPost(id: string): Promise<SyncResult> {
  if (!ZERNIO_ID.test(id)) return "skipped";
  try {
    const post = await getPost(id);
    if (!post) return "skipped";
    const result = await upsertPost(post);
    if (result === "synced") refreshNews();
    return result;
  } catch {
    return "failed";
  }
}

export type BulkSyncResult = { synced: number; skipped: number; failed: number; ok: boolean };

/** Upserts every post updated since `since`. Never throws. */
export async function syncRecentZernioPosts(since: Date): Promise<BulkSyncResult> {
  const result: BulkSyncResult = { synced: 0, skipped: 0, failed: 0, ok: true };
  try {
    let cursor: string | null = null;
    for (let page = 0; page < MAX_PAGES; page++) {
      const { posts, nextCursor } = await listPosts({ updatedSince: since, limit: 50, cursor });
      for (const post of posts) result[await upsertPost(post)]++;
      if (!nextCursor || posts.length === 0) break;
      cursor = nextCursor;
    }
  } catch {
    result.ok = false;
  }
  if (result.synced > 0) refreshNews();
  result.ok &&= result.failed === 0;
  return result;
}
