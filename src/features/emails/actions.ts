"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentMember } from "@/lib/auth/member";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { buildUnsubscribeUrls, campaignInputSchema, composeEmail } from "./compose";
import { createGmailTransport, getMailerConfig, senderAddress } from "./mailer";
import { loadRecipients } from "./queries";
import { checkDailyQuota, nextChunk } from "./quota";

// Member-only actions. Membership is checked first (getCurrentMember
// redirects non-members); campaigns are created with the member's session so
// `sent_by` comes from their JWT. Delivery rows, tokens and counters are
// written with the admin client because clients have no write policies there.

const idSchema = z.uuid();
const NOT_CONFIGURED =
  "El envío de correos no está configurado (faltan GMAIL_USER, GMAIL_APP_PASSWORD o NEXT_PUBLIC_SITE_URL).";

type Fail = { ok: false; message: string };
export type StartResult = { ok: true; campaignId: string; total: number } | Fail;
export type ChunkResult =
  | { ok: true; processed: number; total: number; sent: number; failed: number; done: boolean }
  | Fail;

async function sentLast24h(admin: ReturnType<typeof createAdminClient>) {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count, error } = await admin
    .from("email_deliveries")
    .select("email", { count: "exact", head: true })
    .in("status", ["pending", "sent"])
    .gte("sent_at", since);
  if (error) throw new Error("quota");
  return count ?? 0;
}

export async function startCampaign(
  eventId: string,
  input: { subject: string; body: string },
): Promise<StartResult> {
  await getCurrentMember();
  if (!idSchema.safeParse(eventId).success) {
    return { ok: false, message: "Evento no encontrado." };
  }
  const parsed = campaignInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Datos no válidos." };
  }
  if (!getMailerConfig()) return { ok: false, message: NOT_CONFIGURED };

  const supabase = await createClient();
  const recipients = await loadRecipients(supabase);
  if (recipients.length === 0) {
    return { ok: false, message: "No hay personas que hayan aceptado recibir correos." };
  }
  const quota = checkDailyQuota({
    sentLast24h: await sentLast24h(createAdminClient()),
    pending: recipients.length,
  });
  if (!quota.ok) return { ok: false, message: quota.message };

  const { data, error } = await supabase
    .from("email_campaigns")
    .insert({ event_id: eventId, ...parsed.data, recipient_count: recipients.length })
    .select("id")
    .single();
  if (error || !data) return { ok: false, message: "No se pudo crear el envío." };
  revalidatePath(`/panel/eventos/${eventId}`);
  return { ok: true, campaignId: data.id, total: recipients.length };
}

// Sends the next chunk (at most CHUNK_SIZE) of a campaign. Safe to call again
// after an interruption: recipients with a delivery row are never re-sent.
export async function sendCampaignChunk(campaignId: string): Promise<ChunkResult> {
  await getCurrentMember();
  if (!idSchema.safeParse(campaignId).success) {
    return { ok: false, message: "Envío no encontrado." };
  }
  const config = getMailerConfig();
  if (!config) return { ok: false, message: NOT_CONFIGURED };

  const supabase = await createClient();
  const { data: campaign } = await supabase
    .from("email_campaigns")
    .select("id, event_id, subject, body, status")
    .eq("id", campaignId)
    .maybeSingle();
  if (!campaign) return { ok: false, message: "Envío no encontrado." };
  // A finished campaign never picks up people who consented later.
  if (campaign.status === "sent" || campaign.status === "failed") {
    return { ok: false, message: "Este envío ya ha terminado." };
  }
  const content = campaignInputSchema.safeParse(campaign);
  if (!content.success) return { ok: false, message: "El envío no es válido." };

  const admin = createAdminClient();
  const [recipients, handledRows] = await Promise.all([
    loadRecipients(supabase),
    admin.from("email_deliveries").select("email").eq("campaign_id", campaignId),
  ]);
  if (handledRows.error) return { ok: false, message: "No se pudo leer el progreso." };
  const handled = handledRows.data.map((row) => row.email);
  const { chunk, remaining } = nextChunk(recipients, handled);

  if (chunk.length > 0) {
    const quota = checkDailyQuota({ sentLast24h: await sentLast24h(admin), pending: remaining });
    if (!quota.ok) return { ok: false, message: quota.message };
    const failure = await sendChunk(admin, config, campaignId, chunk, content.data);
    if (failure) return { ok: false, message: failure };
  }

  // Counters come from the delivery log, never from the client.
  const count = async (status: string) =>
    (
      await admin
        .from("email_deliveries")
        .select("email", { count: "exact", head: true })
        .eq("campaign_id", campaignId)
        .eq("status", status)
    ).count ?? 0;
  const [sent, failed, pending] = await Promise.all([
    count("sent"),
    count("failed"),
    count("pending"),
  ]);
  const left = remaining - chunk.length;
  const done = left <= 0;
  await admin
    .from("email_campaigns")
    .update({
      sent_count: sent,
      status: !done ? "partial" : sent === 0 && failed > 0 ? "failed" : "sent",
      finished_at: done ? new Date().toISOString() : null,
    })
    .eq("id", campaignId);
  if (done && campaign.event_id) revalidatePath(`/panel/eventos/${campaign.event_id}`);

  const processed = sent + failed + pending;
  return { ok: true, processed, total: processed + Math.max(left, 0), sent, failed, done };
}

async function sendChunk(
  admin: ReturnType<typeof createAdminClient>,
  config: NonNullable<ReturnType<typeof getMailerConfig>>,
  campaignId: string,
  chunk: string[],
  content: { subject: string; body: string },
): Promise<string | null> {
  // Ensure every recipient has a preferences row (and so a token).
  const prefsInsert = await admin
    .from("mailing_preferences")
    .upsert(
      chunk.map((email) => ({ email })),
      { onConflict: "email", ignoreDuplicates: true },
    );
  if (prefsInsert.error) return "No se pudieron preparar los destinatarios.";
  const { data: prefs, error: prefsError } = await admin
    .from("mailing_preferences")
    .select("email, unsubscribe_token, unsubscribed_at")
    .in("email", chunk);
  if (prefsError || !prefs) return "No se pudieron preparar los destinatarios.";
  const tokens = new Map(
    prefs.filter((p) => !p.unsubscribed_at).map((p) => [p.email, p.unsubscribe_token]),
  );

  // Claim before sending: only rows this call inserted are sent.
  const { data: claimed, error: claimError } = await admin
    .from("email_deliveries")
    .upsert(
      chunk
        .filter((email) => tokens.has(email))
        .map((email) => ({ campaign_id: campaignId, email, status: "pending" })),
      { onConflict: "campaign_id,email", ignoreDuplicates: true },
    )
    .select("email");
  if (claimError || !claimed) return "No se pudo registrar el envío.";

  const transport = createGmailTransport(config);
  const results: { email: string; ok: boolean; error?: string }[] = [];
  try {
    for (const { email } of claimed) {
      const message = composeEmail({
        ...content,
        unsubscribe: buildUnsubscribeUrls(config.siteUrl, tokens.get(email)!),
      });
      try {
        await transport.sendMail({ from: senderAddress(config.user), to: email, ...message });
        results.push({ email, ok: true });
      } catch (error) {
        // Store only a short error code, never the SMTP transcript.
        const code = (error as { code?: string; responseCode?: number }) ?? {};
        results.push({
          email,
          ok: false,
          error: String(code.responseCode ?? code.code ?? "send_failed").slice(0, 50),
        });
      }
    }
  } finally {
    transport.close();
  }

  const now = new Date().toISOString();
  const sentEmails = results.filter((r) => r.ok).map((r) => r.email);
  if (sentEmails.length > 0) {
    await admin
      .from("email_deliveries")
      .update({ status: "sent", sent_at: now })
      .eq("campaign_id", campaignId)
      .in("email", sentEmails);
  }
  for (const failure of results.filter((r) => !r.ok)) {
    await admin
      .from("email_deliveries")
      .update({ status: "failed", error: failure.error, sent_at: now })
      .eq("campaign_id", campaignId)
      .eq("email", failure.email);
  }
  console.info(`[emails] chunk: ${sentEmails.length} sent, ${results.length - sentEmails.length} failed`);
  return null;
}
