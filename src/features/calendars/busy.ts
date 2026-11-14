import "server-only";

// Busy time from a member's Google calendar, as UTC instants.
export type BusyBlock = { start: string; end: string };

// Contract shared with the availability feature (T5):
// - `email`: member email (lowercase).
// - `from` / `to`: UTC instants; returns blocks that overlap [from, to).
// - Blocks are ISO 8601 UTC strings; overlapping blocks are allowed.
// - Must not throw for a member without a connected calendar: return [].
// Placeholder until the Google calendars feature lands (owner: Iván).
export async function getBusyBlocks(
  email: string,
  from: Date,
  to: Date,
): Promise<BusyBlock[]> {
  void email;
  void from;
  void to;
  return [];
}
