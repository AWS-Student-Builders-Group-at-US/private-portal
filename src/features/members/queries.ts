import "server-only";
import { createClient } from "@/lib/supabase/server";
import { hideCommonAccount } from "./common-account";
import type { MemberRow } from "./types";

// RLS only exposes the list to members. The group's common account is
// filtered out here so its address never reaches the browser.
// `total` still counts the common account (for the "last member" guard).
export async function listMembers(): Promise<{ members: MemberRow[]; total: number }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("members")
    .select("email, name, area, created_at")
    .order("name");
  if (error) throw new Error("No se pudieron cargar los miembros.");
  return { members: hideCommonAccount(data), total: data.length };
}
