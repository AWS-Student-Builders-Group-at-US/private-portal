import "server-only";
import { createClient } from "@/lib/supabase/server";
import { hideCommonAccount } from "./common-account";
import type { MemberRow } from "./types";

// RLS only exposes the list to members. The group's common account is
// filtered out here so its address never reaches the browser.
// `total` still counts the common account (for the "last member" guard).
export async function listMembers(): Promise<{ members: MemberRow[]; total: number }> {
  const supabase = await createClient();
  const columns = "email, name, area, created_at";
  const withFlag = await supabase
    .from("members")
    .select(`${columns}, can_schedule_meetings`)
    .order("name");
  let rows: MemberRow[];
  if (!withFlag.error) {
    rows = withFlag.data.map((m) => ({ ...m, can_schedule_meetings: m.can_schedule_meetings === true }));
  } else {
    // Before the meeting_organizers migration the column does not exist yet.
    const { data, error } = await supabase.from("members").select(columns).order("name");
    if (error) throw new Error("No se pudieron cargar los miembros.");
    rows = data.map((m) => ({ ...m, can_schedule_meetings: false }));
  }
  return { members: hideCommonAccount(rows), total: rows.length };
}
