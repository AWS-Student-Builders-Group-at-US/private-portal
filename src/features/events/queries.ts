import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { EventDetail, EventFile, EventSummary } from "./types";

// All reads use the user's session; RLS only returns rows to members.

export async function listEvents(): Promise<EventSummary[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("events")
    .select(
      "id, title, starts_at, ends_at, location, expected_attendees, event_files(count)",
    )
    .order("starts_at", { ascending: true });
  if (error) throw new Error("No se pudieron cargar los eventos.");

  return data.map(({ event_files, ...event }) => ({
    ...event,
    file_count: (event_files as { count: number }[])[0]?.count ?? 0,
  }));
}

export async function getEvent(id: string): Promise<EventDetail | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("events")
    .select(
      "id, title, description, starts_at, ends_at, location, meetup_url, expected_attendees, is_public, created_by, created_at, updated_at",
    )
    .eq("id", id)
    .maybeSingle();
  // An invalid uuid is a "not found", not a server error.
  if (error) return null;
  return data;
}

export async function listEventFiles(eventId: string): Promise<EventFile[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("event_files")
    .select("id, file_name, size_bytes, content_type, uploaded_by, created_at")
    .eq("event_id", eventId)
    .order("created_at", { ascending: false });
  if (error) throw new Error("No se pudieron cargar los archivos.");
  return data;
}
