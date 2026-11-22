import "server-only";
import { cacheLife } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Link } from "./types";

// Panel list reads are "use cache: private": cached per session in the browser
// only (never in a shared server cache, so RLS results never cross members)
// for the "minutes" profile (5 min client stale time), which lets the panel
// prefetch and reopen pages instantly. The Server Actions that change this
// data call revalidatePath, which clears that client cache for the actor.

// All reads use the user's session; RLS only returns rows to members.
const COLUMNS = "id, title, url, category, notes, created_by, created_at";

export async function listLinks(): Promise<Link[]> {
  "use cache: private";
  cacheLife("minutes");
  const supabase = await createClient();
  const { data, error } = await supabase.from("links").select(COLUMNS).order("title");
  if (error) throw new Error("No se pudieron cargar los enlaces.");
  return data;
}

export async function getLink(id: string): Promise<Link | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("links").select(COLUMNS).eq("id", id).maybeSingle();
  if (error) return null;
  return data;
}
