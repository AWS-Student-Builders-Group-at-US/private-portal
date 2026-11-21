import { after } from "next/server";
import { parseWebhookEnvelope } from "@/features/zernio/envelope";
import { verifyZernioSignature } from "@/features/zernio/signature";
import { syncPostMetrics } from "@/features/zernio/metrics-sync";
import { syncZernioPost } from "@/features/zernio/sync";
import { createAdminClient } from "@/lib/supabase/admin";

// Zernio webhook (post.* events, plus analytics.synced for post insights). Public route: the only credential is the
// `X-Zernio-Signature` HMAC of the raw body with ZERNIO_WEBHOOK_SECRET.
// Zernio needs a 2xx within 5 s and retries up to 7 times, so the event id is
// recorded first (dedupe) and the post is fetched from the API and synced
// after the response with `after()`. The payload is never trusted for content.

export const maxDuration = 60;

const MAX_BODY_BYTES = 256 * 1024;
const noStore = { "Cache-Control": "no-store" };
const reply = (status: number, text: string) => new Response(text, { status, headers: noStore });

export async function POST(request: Request) {
  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) return reply(413, "too large");
  const signature = request.headers.get("x-zernio-signature");
  if (!verifyZernioSignature(raw, signature, process.env.ZERNIO_WEBHOOK_SECRET)) {
    return reply(401, "invalid signature");
  }

  const envelope = parseWebhookEnvelope(raw, request.headers.get("x-zernio-event-id"));
  if (!envelope) return reply(400, "invalid payload");

  try {
    const { error } = await createAdminClient()
      .from("zernio_webhook_events")
      .insert({ id: envelope.eventId, event: envelope.event });
    if (error?.code === "23505") return reply(200, "duplicate");
    if (error) return reply(500, "error");
  } catch {
    return reply(500, "error");
  }

  if (envelope.event === "analytics.synced") {
    // One account finished an analytics sync: refresh the stored insights.
    after(async () => {
      const result = await syncPostMetrics();
      console.info("webhooks/zernio", envelope.event, result.ok ? "synced" : "failed");
    });
    return reply(200, "ok");
  }

  const postId = envelope.postId;
  if (postId) {
    after(async () => {
      const result = await syncZernioPost(postId);
      // Outcome only: never log payloads, ids or keys.
      console.info("webhooks/zernio", envelope.event, result);
    });
  }
  return reply(200, "ok");
}
