import { sanitizeFileName } from "@/features/events/files";
import { getSupabaseEnv } from "@/lib/supabase/env";

export const PUBLIC_MEDIA_BUCKET = "public-media";

// `posts/<uuid>-<sanitized file name>`
export function buildPostImagePath(fileName: string) {
  return `posts/${crypto.randomUUID()}-${sanitizeFileName(fileName)}`;
}

// Public URL of an object in the public bucket (no request needed).
export function publicMediaUrl(path: string) {
  const { url } = getSupabaseEnv();
  return `${url}/storage/v1/object/public/${PUBLIC_MEDIA_BUCKET}/${path}`;
}
