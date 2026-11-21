import "server-only";
import { createClient } from "@/lib/supabase/server";
import { addDaysIso } from "./logic";
import type { Reminder } from "./types";

// The signed-in member's reminders from a week ago on, read with their
// session (RLS: own rows only). Returns [] when the read fails (e.g. the
// migration is not applied yet on a preview) so the panel home still renders.
export async function listMyReminders(today: string): Promise<Reminder[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("reminders")
    .select("id, title, note, remind_on, sent_at")
    .gte("remind_on", addDaysIso(today, -7))
    .order("remind_on", { ascending: true })
    .order("created_at", { ascending: true });
  if (error || !data) return [];
  return data as Reminder[];
}
