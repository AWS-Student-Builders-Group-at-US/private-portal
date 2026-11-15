import "server-only";
import { createClient } from "@/lib/supabase/server";
import { refreshBusyBlocks } from "./refresh";

const STALE_AFTER = "15 minutes";

/**
 * Busy intervals of one member between `from` and `to`, for the team
 * availability view.
 *
 * - Server-only; reads `calendar_busy_blocks` with the caller's session, so the
 *   caller must be a signed-in member (non-members get `[]`).
 * - Returns only times (no titles, descriptions or locations), sorted by
 *   start and clipped to [from, to). Blocks from different feeds of the same
 *   member are not merged and may overlap.
 * - If any of that member's feeds was last fetched more than 15 minutes ago,
 *   it refreshes them first (up to ~8 s per feed, in parallel). Fetch errors
 *   are stored in `calendar_feeds.last_error` and never thrown: the cached
 *   blocks are returned instead.
 * - Only throws when the database read itself fails.
 */
export async function getBusyBlocks(
  email: string,
  from: Date,
  to: Date,
): Promise<{ start: Date; end: Date }[]> {
  const memberEmail = email.toLowerCase();
  const supabase = await createClient();

  const { data: stale } = await supabase.rpc("calendar_feeds_need_refresh", {
    p_email: memberEmail,
    p_max_age: STALE_AFTER,
  });
  if (stale === true) await refreshBusyBlocks(memberEmail);

  const { data, error } = await supabase
    .from("calendar_busy_blocks")
    .select("starts_at, ends_at")
    .eq("member_email", memberEmail)
    .lt("starts_at", to.toISOString())
    .gt("ends_at", from.toISOString())
    .order("starts_at", { ascending: true });
  if (error) throw new Error("No se pudieron cargar los horarios ocupados.");

  return data.map((row) => ({
    start: new Date(Math.max(new Date(row.starts_at).getTime(), from.getTime())),
    end: new Date(Math.min(new Date(row.ends_at).getTime(), to.getTime())),
  }));
}
