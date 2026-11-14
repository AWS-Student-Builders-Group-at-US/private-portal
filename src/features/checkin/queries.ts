import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { Attendance, PublicCheckinEvent } from "./types";

// Tokens are 32 lowercase hex characters; anything else is "not found"
// without touching the database.
export const CHECKIN_TOKEN_PATTERN = /^[0-9a-f]{32}$/;

// Public check-in page (no session): admin client, by token, minimal columns.
export async function getCheckinEventByToken(
  token: string,
): Promise<(PublicCheckinEvent & { id: string }) | null> {
  if (!CHECKIN_TOKEN_PATTERN.test(token)) return null;
  const { data, error } = await createAdminClient()
    .from("events")
    .select("id, title, starts_at, location, checkin_open")
    .eq("checkin_token", token)
    .maybeSingle();
  if (error) throw new Error("No se pudo cargar el evento.");
  return data;
}

// Member panel: user's session, RLS limits rows to members.
export async function getAttendance(eventId: string): Promise<Attendance | null> {
  const supabase = await createClient();
  const [{ data: event }, { data: attendees, error }] = await Promise.all([
    supabase
      .from("events")
      .select("checkin_token, checkin_open, expected_attendees")
      .eq("id", eventId)
      .maybeSingle(),
    supabase
      .from("attendees")
      .select(
        "id, name, email, photo_consent, email_consent, checked_in_at, form_version_id, answers",
      )
      .eq("event_id", eventId)
      .order("checked_in_at", { ascending: true }),
  ]);
  if (!event || error) return null;
  return { ...event, attendees };
}
