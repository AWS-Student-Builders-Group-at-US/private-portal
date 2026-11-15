import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { getSupabaseEnv } from "./env";

// Supabase client with the SECRET key: bypasses RLS. Keep this list in sync
// with AGENTS.md; these are the ONLY allowed callers:
// - Public check-in (src/features/checkin): reads events by token, reads the
//   active check-in form (also for /privacidad) and writes attendees and
//   rate-limit rows without a session.
// - Calendar feeds: busy-block refresh (src/features/calendars/refresh.ts)
//   and the token iCal export (src/app/api/calendario.ics).
// - Community emails (src/features/emails): public unsubscribe by token and
//   server-only tables written after a membership check.
// - Daily maintenance cron (src/app/api/cron/diario), behind CRON_SECRET.
// - Zernio sync (src/features/zernio): the signed webhook
//   (src/app/api/webhooks/zernio), the cron fallback and the member-only
//   "Sincronizar ahora" action; Zernio rows in posts are server-owned.
// Never expose the key (no NEXT_PUBLIC_). Create one per request, inside
// functions.
export function createAdminClient() {
  const { url } = getSupabaseEnv();
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!secretKey) throw new Error("Missing SUPABASE_SECRET_KEY");
  return createSupabaseClient(url, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
