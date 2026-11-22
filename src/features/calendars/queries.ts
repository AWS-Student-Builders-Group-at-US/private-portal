import "server-only";
import { cacheLife } from "next/cache";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { resolveSiteUrl } from "@/features/checkin/url";
import { maskIcsUrl } from "./url";

export const MAX_FEEDS_PER_MEMBER = 5;

// 1 = "No lo puedo mover", 0.5 = "Lo podría mover".
export type FeedWeight = 1 | 0.5;

export type FeedSummary = {
  id: string;
  label: string;
  weight: FeedWeight;
  masked_url: string;
  last_fetched_at: string | null;
  last_error: string | null;
};

// The signed-in member's feeds. RLS only returns their own rows; the secret
// URL is masked here so it never reaches the browser. Cached per session in
// the browser only ("use cache: private"); the feed actions revalidate the
// calendar path, which clears it.
export async function listMyFeeds(): Promise<FeedSummary[]> {
  "use cache: private";
  cacheLife("minutes");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("calendar_feeds")
    .select("id, label, weight, ics_url, last_fetched_at, last_error")
    .order("created_at", { ascending: true });
  if (error) throw new Error("No se pudieron cargar tus calendarios.");
  return data.map(({ ics_url, weight, ...feed }) => ({
    ...feed,
    weight: Number(weight) === 0.5 ? 0.5 : 1,
    masked_url: maskIcsUrl(ics_url),
  }));
}

// The member's export token, created on first use.
export async function getMyExportToken(): Promise<string> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("ensure_calendar_export_token");
  if (error || typeof data !== "string") {
    throw new Error("No se pudo preparar tu enlace de suscripción.");
  }
  return data;
}

// The signed-in member's personal iCal subscription URL on this site. Cached
// per session in the browser only: it holds the member's secret token.
export async function getMyExportUrl(): Promise<string> {
  "use cache: private";
  cacheLife("minutes");
  const [token, requestHeaders] = await Promise.all([getMyExportToken(), headers()]);
  return buildExportUrl(resolveSiteUrl(requestHeaders), token);
}

export function buildExportUrl(siteUrl: string, token: string) {
  return `${siteUrl.replace(/\/+$/, "")}/api/calendario.ics?token=${token}`;
}
