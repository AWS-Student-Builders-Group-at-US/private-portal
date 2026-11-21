import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { CalendarEntry } from "./types";

// Every member's calendar entries overlapping [from, to), read with the
// user's session through public.list_calendar_entries(): the database hides
// the title and notes of someone else's busy-only entry. Returns [] when the
// read fails (e.g. the migration is not applied yet on a preview), so the
// calendar keeps working from Google and the hand edits alone.
export async function listCalendarEntries(from: Date, to: Date): Promise<CalendarEntry[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("list_calendar_entries", {
    p_from: from.toISOString(),
    p_to: to.toISOString(),
  });
  if (error || !Array.isArray(data)) return [];
  return (data as CalendarEntry[]).map((row) => ({
    ...row,
    visibility: row.visibility === "busy" ? "busy" : "details",
    is_group_meeting: row.is_group_meeting === true,
    is_own: row.is_own === true,
  }));
}
