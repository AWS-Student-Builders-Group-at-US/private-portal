import "server-only";

// Placeholder with the same signature as the Google calendars feature
// (PR #6, owner: Iván), which replaces this file: busy intervals of one member
// clipped to [from, to), or [] when they have no calendar connected.
export async function getBusyBlocks(
  email: string,
  from: Date,
  to: Date,
): Promise<{ start: Date; end: Date }[]> {
  void email;
  void from;
  void to;
  return [];
}
