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
    // Absent before the meeting_organizers migration is applied.
    meeting_url: typeof row.meeting_url === "string" ? row.meeting_url : null,
  }));
}

// Whether the signed-in user may create and manage group meetings (the
// common account and the members it marks in Ajustes). The database checks
// it again on every write; false when the check fails.
export async function canScheduleMeetings(): Promise<boolean> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("can_schedule_meetings");
  return !error && data === true;
}

// Link of the most recently created group meeting that has one, to prefill
// the form (the team usually reuses the same video call room).
export async function getLastMeetingUrl(): Promise<string | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("calendar_entries")
    .select("meeting_url")
    .eq("is_group_meeting", true)
    .not("meeting_url", "is", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  return data.meeting_url;
}
