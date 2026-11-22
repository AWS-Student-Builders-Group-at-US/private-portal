import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { staleFeedEmails } from "./busy-rows";
import { extractBusyBlocks } from "./ics-parse";
import { parseGoogleIcalUrl } from "./url";
import { googleWindow } from "./window";

const FETCH_TIMEOUT_MS = 8000;
const MAX_ICS_BYTES = 5 * 1024 * 1024;
const MAX_REDIRECTS = 3;

class FeedError extends Error {}

// Reads the body as text, aborting once it exceeds MAX_ICS_BYTES.
async function readCapped(response: Response) {
  const declared = Number(response.headers.get("content-length"));
  if (declared > MAX_ICS_BYTES) throw new FeedError("El calendario supera 5 MB.");
  if (!response.body) return "";
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_ICS_BYTES) {
      await reader.cancel();
      throw new FeedError("El calendario supera 5 MB.");
    }
    chunks.push(value);
  }
  return new TextDecoder().decode(Buffer.concat(chunks));
}

// Fetches a Google secret iCal URL. Redirects are followed manually and only
// when the target passes the same allowlist (SSRF guard).
export async function fetchIcs(url: string): Promise<string> {
  const signal = AbortSignal.timeout(FETCH_TIMEOUT_MS);
  let current = parseGoogleIcalUrl(url);
  for (let hop = 0; current && hop <= MAX_REDIRECTS; hop++) {
    let response: Response;
    try {
      response = await fetch(current, {
        redirect: "manual",
        signal,
        cache: "no-store",
        headers: { accept: "text/calendar" },
      });
    } catch {
      throw new FeedError("No se pudo descargar el calendario (tiempo agotado o error de red).");
    }
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      current = location ? parseGoogleIcalUrl(new URL(location, current).href) : null;
      continue;
    }
    if (!response.ok) {
      throw new FeedError(`Google Calendar respondió ${response.status}. Revisa la dirección.`);
    }
    return readCapped(response);
  }
  throw new FeedError("Redirección no permitida.");
}

type FeedRow = { id: string; ics_url: string; weight: number | string | null };

// Feeds older than this are refreshed in the background on the next view.
const STALE_AFTER_MS = 15 * 60 * 1000;

/**
 * Lowercased emails, among `emails`, of the members with a feed never fetched
 * or last fetched more than 15 minutes ago. Uses the admin client so it can
 * run inside `after()`; returns [] on any failure.
 */
export async function listStaleFeedEmails(emails: string[]): Promise<string[]> {
  const wanted = [...new Set(emails.map((email) => email.toLowerCase()))];
  if (wanted.length === 0) return [];
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("calendar_feeds")
      .select("member_email, last_fetched_at")
      .in("member_email", wanted);
    if (error || !data) return [];
    return staleFeedEmails(data, new Date(), STALE_AFTER_MS);
  } catch {
    return [];
  }
}

/**
 * Re-fetches every feed of one member with the admin client and replaces that
 * feed's busy blocks (window: GOOGLE_WINDOW_DAYS back and ahead), copying the
 * feed weight.
 * Failures are recorded in `last_error` per feed and the previous blocks are
 * kept; never throws.
 */
export async function refreshBusyBlocks(email: string): Promise<void> {
  const memberEmail = email.toLowerCase();
  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch {
    console.error(
      "refreshBusyBlocks: cannot create the Supabase admin client (check the server secret key configuration); keeping cached busy blocks.",
    );
    return;
  }
  try {
    const { data: feeds, error } = await admin
      .from("calendar_feeds")
      .select("id, ics_url, weight")
      .eq("member_email", memberEmail);
    if (error || !feeds) return;

    const { from, to } = googleWindow();

    await Promise.all(
      (feeds as FeedRow[]).map(async (feed) => {
        let lastError: string | null = null;
        try {
          const blocks = extractBusyBlocks(await fetchIcs(feed.ics_url), from, to);
          const { error: deleteError } = await admin
            .from("calendar_busy_blocks")
            .delete()
            .eq("feed_id", feed.id);
          if (deleteError) throw new FeedError("No se pudieron guardar los horarios.");
          if (blocks.length > 0) {
            const { error: insertError } = await admin.from("calendar_busy_blocks").insert(
              blocks.map((block) => ({
                member_email: memberEmail,
                feed_id: feed.id,
                starts_at: block.start.toISOString(),
                ends_at: block.end.toISOString(),
                weight: Number(feed.weight) === 0.5 ? 0.5 : 1,
              })),
            );
            if (insertError) throw new FeedError("No se pudieron guardar los horarios.");
          }
        } catch (err) {
          lastError =
            err instanceof FeedError ? err.message : "No se pudo leer el calendario.";
        }
        await admin
          .from("calendar_feeds")
          .update({ last_fetched_at: new Date().toISOString(), last_error: lastError })
          .eq("id", feed.id);
      }),
    );
  } catch {
    // Network or database failure: keep the cached blocks.
  }
}
