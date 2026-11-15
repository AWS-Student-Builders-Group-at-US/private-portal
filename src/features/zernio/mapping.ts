import { previewText, slugify } from "@/features/posts/content";
import { POST_TARGETS, type PostStatus, type PostTarget } from "@/features/posts/schema";
import { ZERNIO_ID } from "./envelope";

// Pure mapping from a Zernio post (API shape, partially verified) to a
// `posts` row. Status rule (simplest safe one):
// - published/partial with at least one platform published -> `published`
//   (shown on the site while `show_on_site` is on);
// - scheduled/publishing/pending -> `approved` with its `scheduled_at`;
// - failed (or partial with nothing published) -> `draft` + `publish_error`;
// - draft/cancelled/unknown -> `draft`.
// Rows are never deleted: anything that is not `published` stays off the site.

export type ZernioPlatform = {
  platform?: string;
  status?: string;
  platformPostUrl?: string | null;
  publishedAt?: string | null;
};

export type ZernioMediaItem = { type?: string; url?: string };

export type ZernioPost = {
  _id?: string;
  id?: string;
  content?: string | null;
  status?: string;
  scheduledFor?: string | null;
  publishedAt?: string | null;
  platforms?: ZernioPlatform[];
  mediaItems?: ZernioMediaItem[];
};

export type PlatformUrls = Partial<Record<"instagram" | "linkedin", string>>;

export type ZernioPostRow = {
  zernio_post_id: string;
  source: "zernio";
  created_by: "zernio";
  title: string;
  slug: string;
  body: string;
  targets: PostTarget[];
  status: PostStatus;
  scheduled_at: string | null;
  published_at: string | null;
  platform_urls: PlatformUrls;
  publish_error: string | null;
};

const TITLE_FALLBACK = "Publicación";
const TITLE_MAX = 120;
const BODY_MAX = 10000;
const SLUG_MAX = 80;
const SUFFIX_LENGTH = 8;
const FAILED_MESSAGE = "La publicación falló en Zernio.";

const PLATFORM_HOSTS = { instagram: "instagram.com", linkedin: "linkedin.com" } as const;
type SupportedPlatform = keyof typeof PLATFORM_HOSTS;
const isSupported = (platform: unknown): platform is SupportedPlatform =>
  typeof platform === "string" && platform in PLATFORM_HOSTS;

const TRAILING_NOISE = /^(#\S*|https?:\/\/\S*)$/i;

export function deriveTitle(content: string | null | undefined): string {
  for (const line of (content ?? "").split(/\r?\n/)) {
    const words = line.trim().split(/\s+/).filter(Boolean);
    while (words.length && TRAILING_NOISE.test(words[words.length - 1])) words.pop();
    const text = words.join(" ");
    if (text) return previewText(text, TITLE_MAX - 1);
  }
  return TITLE_FALLBACK;
}

export function buildSlug(title: string, zernioId: string): string {
  const suffix = zernioId.toLowerCase().replace(/[^a-z0-9]/g, "").slice(-SUFFIX_LENGTH) || "z";
  const base =
    slugify(title)
      .slice(0, SLUG_MAX - suffix.length - 1)
      .replace(/-+$/, "") || "publicacion";
  return `${base}-${suffix}`;
}

export function safePlatformUrl(platform: string | undefined, url: string | null | undefined): string | null {
  if (!isSupported(platform) || typeof url !== "string") return null;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  const host = parsed.hostname.toLowerCase();
  const domain = PLATFORM_HOSTS[platform];
  if (parsed.protocol !== "https:" || (host !== domain && !host.endsWith(`.${domain}`))) return null;
  return parsed.toString();
}

export function platformUrls(platforms: ZernioPlatform[] | undefined): PlatformUrls {
  const urls: PlatformUrls = {};
  for (const p of platforms ?? []) {
    const url = safePlatformUrl(p.platform, p.platformPostUrl);
    if (url && isSupported(p.platform) && !urls[p.platform]) urls[p.platform] = url;
  }
  return urls;
}

function isoOrNull(value: string | null | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function mapStatus(post: ZernioPost, now: Date) {
  const platforms = post.platforms ?? [];
  const published = platforms.filter(
    (p) => p.status === "published" || !!p.platformPostUrl || (post.status === "published" && !p.status),
  );
  if ((post.status === "published" || post.status === "partial") && published.length > 0) {
    const dates = published.map((p) => isoOrNull(p.publishedAt)).filter((d): d is string => !!d).sort();
    const publishedAt = dates[0] ?? isoOrNull(post.publishedAt) ?? now.toISOString();
    return { status: "published" as const, published_at: publishedAt, publish_error: null };
  }
  if (post.status === "scheduled" || post.status === "publishing" || post.status === "pending") {
    return { status: "approved" as const, published_at: null, publish_error: null };
  }
  const failed = post.status === "failed" || post.status === "partial";
  return { status: "draft" as const, published_at: null, publish_error: failed ? FAILED_MESSAGE : null };
}

/** Null when the post has no usable id or targets neither Instagram nor LinkedIn. */
export function mapZernioPost(
  post: ZernioPost,
  now: Date = new Date(),
): (ZernioPostRow & { imageUrl: string | null }) | null {
  const id = post._id ?? post.id;
  if (!id || !ZERNIO_ID.test(id)) return null;
  const platforms = new Set((post.platforms ?? []).map((p) => p.platform).filter(isSupported));
  const targets = POST_TARGETS.filter((t): t is SupportedPlatform => isSupported(t) && platforms.has(t));
  if (targets.length === 0) return null;

  const title = deriveTitle(post.content);
  const body = (post.content ?? "").trim().slice(0, BODY_MAX) || title;
  const image = (post.mediaItems ?? []).find((m) => m.type === "image" && typeof m.url === "string");

  return {
    zernio_post_id: id,
    source: "zernio",
    created_by: "zernio",
    title,
    slug: buildSlug(title, id),
    body,
    targets,
    scheduled_at: isoOrNull(post.scheduledFor),
    platform_urls: platformUrls(post.platforms),
    ...mapStatus(post, now),
    imageUrl: image?.url ?? null,
  };
}
