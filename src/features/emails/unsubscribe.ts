import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

// Public unsubscribe by token (no session). Idempotent; the result is never
// shown to the visitor, so a guessed token reveals nothing.
const TOKEN_PATTERN = /^[0-9a-f]{32}$/;

export async function unsubscribeByToken(token: string): Promise<void> {
  if (!TOKEN_PATTERN.test(token)) return;
  const { error } = await createAdminClient()
    .from("mailing_preferences")
    .update({ unsubscribed_at: new Date().toISOString() })
    .eq("unsubscribe_token", token)
    .is("unsubscribed_at", null);
  if (error) throw new Error("unsubscribe_failed");
}
