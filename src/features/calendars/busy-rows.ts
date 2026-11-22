// Pure helpers for busy blocks: grouping database rows per member and picking
// the members whose Google feeds need a background refresh.

export type BusyBlockRow = { start: Date; end: Date; weight: number; feedId: string };

export type BusyBlockDbRow = {
  member_email: string;
  starts_at: string;
  ends_at: string;
  weight: number | string | null;
  feed_id: string;
};

/**
 * Groups `calendar_busy_blocks` rows per lowercased member email, keeping the
 * input order, clipping each block to [from, to) and normalizing the weight
 * (0.5 = could move, anything else = can't move).
 */
export function groupBusyRows(
  rows: BusyBlockDbRow[],
  from: Date,
  to: Date,
): Map<string, BusyBlockRow[]> {
  const byMember = new Map<string, BusyBlockRow[]>();
  for (const row of rows) {
    const email = row.member_email.toLowerCase();
    const blocks = byMember.get(email) ?? [];
    blocks.push({
      start: new Date(Math.max(new Date(row.starts_at).getTime(), from.getTime())),
      end: new Date(Math.min(new Date(row.ends_at).getTime(), to.getTime())),
      weight: Number(row.weight) === 0.5 ? 0.5 : 1,
      feedId: row.feed_id,
    });
    byMember.set(email, blocks);
  }
  return byMember;
}

export type FeedFreshnessRow = { member_email: string; last_fetched_at: string | null };

/**
 * Lowercased emails (each once, in first-seen order) of the members with at
 * least one feed never fetched or last fetched more than `maxAgeMs` before
 * `now`. An unparsable timestamp counts as stale.
 */
export function staleFeedEmails(rows: FeedFreshnessRow[], now: Date, maxAgeMs: number): string[] {
  const cutoff = now.getTime() - maxAgeMs;
  const stale = new Set<string>();
  for (const row of rows) {
    const fetched = row.last_fetched_at === null ? NaN : Date.parse(row.last_fetched_at);
    if (!(fetched >= cutoff)) stale.add(row.member_email.toLowerCase());
  }
  return [...stale];
}
