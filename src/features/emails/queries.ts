import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { selectRecipients, type ConsentCheckin } from "./recipients";

// Recipient loading and panel reads. Callers must have verified membership
// (getCurrentMember) before calling these: attendees are read with the
// member's session (RLS), unsubscribes with the admin client because
// `mailing_preferences` has no client policies.

const PAGE = 1000;

async function readAll<T>(
  fetchPage: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>,
): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await fetchPage(from, from + PAGE - 1);
    if (error || !data) throw new Error("No se pudieron cargar los destinatarios.");
    rows.push(...data);
    if (data.length < PAGE) return rows;
  }
}

type SessionClient = Awaited<ReturnType<typeof createClient>>;

export async function loadRecipients(supabase: SessionClient): Promise<string[]> {
  const admin = createAdminClient();
  const [checkins, unsubscribed] = await Promise.all([
    readAll<ConsentCheckin>((from, to) =>
      supabase
        .from("attendees")
        .select("email, email_consent, checked_in_at")
        .order("id")
        .range(from, to),
    ),
    readAll<{ email: string }>((from, to) =>
      admin
        .from("mailing_preferences")
        .select("email")
        .not("unsubscribed_at", "is", null)
        .order("email")
        .range(from, to),
    ),
  ]);
  return selectRecipients(
    checkins,
    unsubscribed.map((row) => row.email),
  );
}

export type CampaignSummary = {
  id: string;
  subject: string;
  status: "sending" | "sent" | "partial" | "failed";
  recipient_count: number;
  sent_count: number;
  failed_count: number;
  sent_by: string;
  created_at: string;
};

export async function getEmailOverview(eventId: string) {
  const supabase = await createClient();
  const [recipients, { data: campaigns, error }] = await Promise.all([
    loadRecipients(supabase),
    supabase
      .from("email_campaigns")
      .select("id, subject, status, recipient_count, sent_count, sent_by, created_at")
      .eq("event_id", eventId)
      .order("created_at", { ascending: false }),
  ]);
  if (error) throw new Error("No se pudieron cargar los envíos.");

  const withFailures: CampaignSummary[] = await Promise.all(
    (campaigns ?? []).map(async (campaign) => {
      const { count } = await supabase
        .from("email_deliveries")
        .select("email", { count: "exact", head: true })
        .eq("campaign_id", campaign.id)
        .eq("status", "failed");
      return { ...campaign, failed_count: count ?? 0 };
    }),
  );
  return { recipientCount: recipients.length, campaigns: withFailures };
}
