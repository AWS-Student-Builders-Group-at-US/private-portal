import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";

// Public, cached reads (same for every visitor). Failures return empty data so
// the page still renders; the cache retries after a few minutes.

export const NEWS_TAG = "public-news";
export const EVENTS_TAG = "public-events";

export type NewsItem = {
  title: string;
  slug: string;
  body: string;
  image_path: string | null;
  published_on: string;
};

export type PublicEvent = {
  title: string;
  starts_at: string;
  ends_at: string | null;
  location: string | null;
  meetup_url: string | null;
};

export async function getNews(limit = 20): Promise<NewsItem[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag(NEWS_TAG);
  try {
    const { data, error } = await createPublicClient().rpc("public_news", { p_limit: limit });
    return error ? [] : (data as NewsItem[]);
  } catch {
    return [];
  }
}

export async function getNewsItem(slug: string): Promise<NewsItem | null> {
  "use cache";
  cacheLife("minutes");
  cacheTag(NEWS_TAG);
  try {
    const { data, error } = await createPublicClient().rpc("public_news_item", { p_slug: slug });
    return error ? null : ((data as NewsItem[])[0] ?? null);
  } catch {
    return null;
  }
}

export async function getUpcomingEvents(limit = 6): Promise<PublicEvent[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag(EVENTS_TAG);
  try {
    const { data, error } = await createPublicClient().rpc("public_upcoming_events", {
      p_limit: limit,
    });
    return error ? [] : (data as PublicEvent[]);
  } catch {
    return [];
  }
}
