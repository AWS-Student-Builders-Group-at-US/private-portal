import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { PUBLIC_MEDIA_BUCKET } from "@/features/posts/media";

// Copies a Zernio image into the public bucket so the site never hotlinks
// Zernio's CDN. Server-owned path `posts/zernio-<id>.<ext>` (upserted).

const TIMEOUT_MS = 10_000;
// The `public-media` bucket rejects files above 5 MB, so larger ones are skipped.
const MAX_BYTES = 5 * 1024 * 1024;
const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/** Returns the stored path, or null when the image cannot be copied. Never throws. */
export async function copyZernioImage(
  admin: SupabaseClient,
  zernioId: string,
  imageUrl: string,
): Promise<string | null> {
  try {
    const url = new URL(imageUrl);
    if (url.protocol !== "https:") return null;
    const response = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS), cache: "no-store" });
    if (!response.ok) return null;
    const type = (response.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
    const ext = EXTENSIONS[type];
    const declared = Number(response.headers.get("content-length") ?? 0);
    if (!ext || declared > MAX_BYTES) return null;
    const bytes = await response.arrayBuffer();
    if (bytes.byteLength === 0 || bytes.byteLength > MAX_BYTES) return null;

    const path = `posts/zernio-${zernioId.replace(/[^A-Za-z0-9_-]/g, "")}.${ext}`;
    const { error } = await admin.storage
      .from(PUBLIC_MEDIA_BUCKET)
      .upload(path, bytes, { contentType: type, upsert: true });
    return error ? null : path;
  } catch {
    return null;
  }
}
