import type { NextRequest } from "next/server";
import { refreshBusyBlocks } from "@/features/calendars/refresh";
import { isAuthorizedCron } from "@/features/maintenance/cron-auth";
import { retentionCutoff, settleWithin } from "@/features/maintenance/retention";
import { createAdminClient } from "@/lib/supabase/admin";

// Daily maintenance, triggered by Vercel Cron (`vercel.json`, once a day on
// Hobby). Public route excluded from the proxy: the only credential is
// `Authorization: Bearer $CRON_SECRET`, which Vercel sends automatically.
//
// 1. Deletes check-in rate-limit rows (hashed IPs) older than 24 h.
// 2. Reads one row so Supabase Free sees activity and does not pause.
// 3. Refreshes every member's Google calendar busy blocks within a budget.

export const maxDuration = 60;

// Leaves headroom under maxDuration for the other steps and the response.
const REFRESH_BUDGET_MS = 40_000;

const noStore = { "Cache-Control": "no-store" };

export async function GET(request: NextRequest) {
  if (!isAuthorizedCron(request.headers.get("authorization"), process.env.CRON_SECRET)) {
    return new Response(null, { status: 401, headers: noStore });
  }

  let ok = true;
  let deletedAttempts = 0;
  let emails: string[] = [];
  try {
    const admin = createAdminClient();

    const { count, error: deleteError } = await admin
      .from("checkin_attempts")
      .delete({ count: "exact" })
      .lt("created_at", retentionCutoff(new Date()).toISOString());
    if (deleteError) ok = false;
    deletedAttempts = count ?? 0;

    const { error: keepAliveError } = await admin
      .from("members")
      .select("email")
      .limit(1);
    if (keepAliveError) ok = false;

    const { data: feeds, error: feedsError } = await admin
      .from("calendar_feeds")
      .select("member_email");
    if (feedsError) ok = false;
    emails = [...new Set((feeds ?? []).map((row) => row.member_email as string))];
  } catch {
    // Missing configuration or network failure: report, never throw.
    ok = false;
  }

  // refreshBusyBlocks never throws; feed errors are stored per feed.
  const { fulfilled, failed } = await settleWithin(
    emails.map((email) => refreshBusyBlocks(email)),
    REFRESH_BUDGET_MS,
  );

  const result = {
    ok: ok && failed === 0,
    deletedAttempts,
    refreshedMembers: fulfilled,
    failedMembers: failed,
  };
  // Counts only: never log emails, hashes or error details.
  console.info("cron/diario", JSON.stringify(result));
  return Response.json(result, { headers: noStore });
}
