import "server-only";
import { createClient } from "@/lib/supabase/server";

// Route handlers do not go through the /panel layout gate, so they check
// membership themselves. Returns the session client, or null for non-members.
export async function memberClientOrNull() {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("is_member");
  return !error && data === true ? supabase : null;
}

export const notFoundResponse = () =>
  new Response("Not found", { status: 404, headers: { "Cache-Control": "no-store" } });
