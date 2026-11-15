import type { NextRequest } from "next/server";
import { refreshBusyBlocks } from "@/features/calendars/refresh";
import { isAuthorizedCron } from "@/features/maintenance/cron-auth";
import { retentionCutoff, settleWithin } from "@/features/maintenance/retention";
import { isZernioConfigured } from "@/features/zernio/client";
import { syncRecentZernioPosts, type BulkSyncResult } from "@/features/zernio/sync";
import { createAdminClient } from "@/lib/supabase/admin";

// Daily maintenance, triggered by Vercel Cron (`vercel.json`, once a day on
// Hobby). Public route excluded from the proxy: the only credential is
// `Authorization: Bearer $CRON_SECRET`, which Vercel sends automatically.
//
// 1. Deletes check-in rate-limit rows (hashed IPs) older than 24 h.
// 2. Reads one row so Supabase Free sees activity and does not pause.
// 3. Refreshes every member's Google calendar busy blocks within a budget.
// 4. Deletes Zernio webhook dedupe rows older than 30 days and, when
//    ZERNIO_API_KEY is set, re-syncs Zernio posts updated in the last 48 h
//    (fallback for missed webhooks), in parallel with step 3.

export const maxDuration = 60;

// Leaves headroom under maxDuration for the other steps and the response.
const REFRESH_BUDGET_MS = 40_000;

const HOUR = 60 * 60 * 1000;
const ZERNIO_LOOKBACK_MS = 48 * HOUR;
const WEBHOOK_EVENTS_RETENTION_HOURS = 30 * 24;

const noStore = { "Cache-Control": "no-store" };

export async function GET(request: NextRequest) {
  if (!isAuthorizedCron(request.headers.get("authorization"), process.env.CRON_SECRET)) {
    return new Response(null, { status: 401, headers: noStore });
  }

  let ok = true;
  let deletedAttempts = 0;
  let deletedWebhookEvents = 0;
  let emails: string[] = [];
  try {
    const admin = createAdminClient();

    const { count, error: deleteError } = await admin
      .from("checkin_attempts")
      .delete({ count: "exact" })
      .lt("created_at", retentionCutoff(new Date()).toISOString());
    if (deleteError) ok = false;
    deletedAttempts = count ?? 0;

    const { count: eventsCount, error: eventsError } = await admin
      .from("zernio_webhook_events")
      .delete({ count: "exact" })
      .lt("received_at", retentionCutoff(new Date(), WEBHOOK_EVENTS_RETENTION_HOURS).toISOString());
    if (eventsError) ok = false;
    deletedWebhookEvents = eventsCount ?? 0;

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

  // refreshBusyBlocks and syncRecentZernioPosts never throw; feed errors are
  // stored per feed.
  const zernioState: { result: BulkSyncResult | "not_configured" | "timeout" } = {
    result: "not_configured",
  };
  const zernioTask = isZernioConfigured()
    ? syncRecentZernioPosts(new Date(Date.now() - ZERNIO_LOOKBACK_MS)).then((r) => {
        zernioState.result = r;
      })
    : null;
  const [{ fulfilled, failed }, zernioRun] = await Promise.all([
    settleWithin(
      emails.map((email) => refreshBusyBlocks(email)),
      REFRESH_BUDGET_MS,
    ),
    settleWithin(zernioTask ? [zernioTask] : [], REFRESH_BUDGET_MS),
  ]);
  const zernio = zernioTask && zernioRun.failed > 0 ? "timeout" : zernioState.result;
  const zernioOk = typeof zernio === "string" ? zernio === "not_configured" : zernio.ok;

  const result = {
    ok: ok && failed === 0 && zernioOk,
    deletedAttempts,
    deletedWebhookEvents,
    refreshedMembers: fulfilled,
    failedMembers: failed,
    zernio,
  };
  // Counts only: never log emails, hashes or error details.
  console.info("cron/diario", JSON.stringify(result));
  return Response.json(result, { headers: noStore });
}
