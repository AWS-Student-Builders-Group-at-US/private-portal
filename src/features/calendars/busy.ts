import "server-only";
import { after } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { refreshBusyBlocks } from "./refresh";

const STALE_AFTER = "15 minutes";

export type BusyBlockRow = { start: Date; end: Date; weight: number; feedId: string };

/**
 * Busy intervals of one member between `from` and `to`, for the team
 * availability view.
 *
 * - Server-only; reads `calendar_busy_blocks` with the caller's session, so the
 *   caller must be a signed-in member (non-members get `[]`).
 * - Returns only times plus the feed weight (1 = can't move, 0.5 = could
 *   move) and feed id (no titles, descriptions or locations), sorted by
 *   start and clipped to [from, to). Blocks from different feeds of the same
 *   member are not merged and may overlap.
 * - Never waits for Google: it always returns the cached blocks. If any of
 *   that member's feeds was last fetched more than 15 minutes ago, it
 *   schedules `refreshBusyBlocks` with `after()`, so the refresh runs once the
 *   response is sent and the next load shows the new blocks. The refresh uses
 *   the admin client (no request cookies) and stores fetch errors in
 *   `calendar_feeds.last_error` instead of throwing.
 * - Must be called during a request (Server Component, Server Function or
 *   Route Handler), where `after()` is available.
 * - Only throws when the database read itself fails.
 */
export async function getBusyBlocks(
  email: string,
  from: Date,
  to: Date,
): Promise<BusyBlockRow[]> {
  const memberEmail = email.toLowerCase();
  const supabase = await createClient();

  const { data: stale } = await supabase.rpc("calendar_feeds_need_refresh", {
    p_email: memberEmail,
    p_max_age: STALE_AFTER,
  });
  if (stale === true) after(() => refreshBusyBlocks(memberEmail));

  const { data, error } = await supabase
    .from("calendar_busy_blocks")
    .select("starts_at, ends_at, weight, feed_id")
    .eq("member_email", memberEmail)
    .lt("starts_at", to.toISOString())
    .gt("ends_at", from.toISOString())
    .order("starts_at", { ascending: true });
  if (error) throw new Error("No se pudieron cargar los horarios ocupados.");

  return data.map((row) => ({
    start: new Date(Math.max(new Date(row.starts_at).getTime(), from.getTime())),
    end: new Date(Math.min(new Date(row.ends_at).getTime(), to.getTime())),
    weight: Number(row.weight) === 0.5 ? 0.5 : 1,
    feedId: row.feed_id,
  }));
}
