import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { getSupabaseEnv } from "./env";

// Session-less client for the public website: runs as `anon` and never reads
// cookies, so its results can be cached and shared by every visitor.
export function createPublicClient() {
  const { url, publishableKey } = getSupabaseEnv();
  return createSupabaseClient(url, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
