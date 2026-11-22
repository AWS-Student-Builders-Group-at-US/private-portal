import "server-only";
import { after } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { groupBusyRows, type BusyBlockRow } from "./busy-rows";
import { listStaleFeedEmails, refreshBusyBlocks } from "./refresh";

export type { BusyBlockRow } from "./busy-rows";

/**
 * Busy intervals between `from` and `to` for the availability views, per
 * lowercased member email, in one database read.
 *
 * - Server-only; reads `calendar_busy_blocks` with the caller's session, so the
 *   caller must be a signed-in member (non-members get an empty map). Pass
 *   `email` to read a single member's blocks.
 * - Returns only times plus the feed weight (1 = can't move, 0.5 = could
 *   move) and feed id (no titles, descriptions or locations), sorted by
 *   start and clipped to [from, to). Blocks from different feeds of the same
 *   member are not merged and may overlap.
 * - Never waits for Google and never schedules work, so it can run inside a
 *   `"use cache: private"` scope. Pair it with
 *   `refreshStaleFeedsAfterResponse` outside the cached scope.
 * - Only throws when the database read itself fails.
 */
export async function listBusyBlocks(
  from: Date,
  to: Date,
  email?: string,
): Promise<Map<string, BusyBlockRow[]>> {
  const supabase = await createClient();
  let query = supabase
    .from("calendar_busy_blocks")
    .select("member_email, starts_at, ends_at, weight, feed_id")
    .lt("starts_at", to.toISOString())
    .gt("ends_at", from.toISOString());
  if (email) query = query.eq("member_email", email.toLowerCase());
  const { data, error } = await query.order("starts_at", { ascending: true });
  if (error) throw new Error("No se pudieron cargar los horarios ocupados.");
  return groupBusyRows(data, from, to);
}

/**
 * Schedules, with Next `after()`, a refresh of the Google feeds of `emails`
 * whose last fetch is older than 15 minutes, so the response is never held
 * by Google and the next load shows the new blocks. The freshness check and
 * the refresh use the admin client (no request cookies inside `after`) and
 * never throw.
 *
 * Call it during a request from a Server Component, outside any cached scope
 * (`after` is request-scoped), and only with emails the signed-in member's own
 * RLS read already returned.
 */
export function refreshStaleFeedsAfterResponse(emails: string[]): void {
  if (emails.length === 0) return;
  after(async () => {
    const stale = await listStaleFeedEmails(emails);
    await Promise.all(stale.map((email) => refreshBusyBlocks(email)));
  });
}
