import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { getSupabaseEnv } from "./env";

// Supabase client with the SECRET key: bypasses RLS. Use it ONLY in the public
// check-in flow (src/features/checkin), which must read events by token and
// write attendees without a session. Never expose the key (no NEXT_PUBLIC_).
// Create one per request, inside functions.
export function createAdminClient() {
  const { url } = getSupabaseEnv();
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!secretKey) throw new Error("Missing SUPABASE_SECRET_KEY");
  return createSupabaseClient(url, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
