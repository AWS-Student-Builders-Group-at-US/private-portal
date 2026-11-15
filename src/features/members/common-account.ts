import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizeEmail, withoutEmail } from "./common-account-logic";

// The group's common account is the Gmail account in GMAIL_USER (the AWS
// account is registered with it). Its address is never committed (public
// repo) and never sent to the browser: people lists are filtered here, on the
// server. The database copy (public.private_settings, written only with the
// admin client) lets add_member/update_member/remove_member enforce that only
// the common account manages members.

export type CommonAccountStatus = "configured" | "missing" | "error";

// Only the address is read here; the app password stays with the mailer and
// the inbox.
export function getCommonAccountEmail(): string | null {
  return normalizeEmail(process.env.GMAIL_USER);
}

// Idempotent: upserts the address from GMAIL_USER. Called from the daily cron
// and from the Ajustes render. A missing GMAIL_USER never clears the stored
// value. Never throws and never logs the address.
export async function ensureCommonAccountSetting(): Promise<CommonAccountStatus> {
  const email = getCommonAccountEmail();
  if (!email) return "missing";
  try {
    const { error } = await createAdminClient()
      .from("private_settings")
      .upsert({ key: "common_account_email", value: email, updated_at: new Date().toISOString() });
    return error ? "error" : "configured";
  } catch {
    return "error";
  }
}

// Removes the common account from a list of people (members, assignees…).
export function hideCommonAccount<T>(
  rows: T[],
  emailOf?: (row: T) => string | null,
): T[] {
  return withoutEmail(rows, getCommonAccountEmail(), emailOf);
}
