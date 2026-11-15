import "server-only";
import { createClient } from "@/lib/supabase/server";
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
// URL is masked here so it never reaches the browser.
export async function listMyFeeds(): Promise<FeedSummary[]> {
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

export function buildExportUrl(siteUrl: string, token: string) {
  return `${siteUrl.replace(/\/+$/, "")}/api/calendario.ics?token=${token}`;
}
