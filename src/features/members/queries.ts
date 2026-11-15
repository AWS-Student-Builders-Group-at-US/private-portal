import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { MemberRow } from "./types";

// RLS only exposes the list to members.
export async function listMembers(): Promise<MemberRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("members")
    .select("email, name, area, created_at, added_by")
    .order("name");
  if (error) throw new Error("No se pudieron cargar los miembros.");
  return data;
}
