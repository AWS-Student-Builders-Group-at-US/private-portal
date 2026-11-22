import "server-only";
import { cacheLife } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { addDaysIso } from "./logic";
import type { Reminder } from "./types";

// Panel list reads are "use cache: private": cached per session in the browser
// only (never in a shared server cache, so RLS results never cross members)
// for the "minutes" profile (5 min client stale time), which lets the panel
// prefetch and reopen pages instantly. The Server Actions that change this
// data call revalidatePath, which clears that client cache for the actor.

// The signed-in member's reminders from a week ago on, read with their
// session (RLS: own rows only). Returns [] when the read fails (e.g. the
// migration is not applied yet on a preview) so the panel home still renders.
export async function listMyReminders(today: string): Promise<Reminder[]> {
  "use cache: private";
  cacheLife("minutes");
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
