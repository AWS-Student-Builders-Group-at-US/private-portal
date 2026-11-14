import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Link } from "./types";

// All reads use the user's session; RLS only returns rows to members.
const COLUMNS = "id, title, url, category, notes, created_by, created_at";

export async function listLinks(): Promise<Link[]> {
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
