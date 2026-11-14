// Sending limits. Gmail allows about 500 recipients a day; we stop at 450 to
// keep a margin. Each server action sends at most CHUNK_SIZE emails so it fits
// in a Vercel function time limit; the client loops over chunks.

export const DAILY_LIMIT = 450;
export const CHUNK_SIZE = 25;

export type QuotaDecision =
  | { ok: true }
  | { ok: false; available: number; message: string };

export function checkDailyQuota({
  sentLast24h,
  pending,
}: {
  sentLast24h: number;
  pending: number;
}): QuotaDecision {
  if (pending <= 0 || sentLast24h + pending <= DAILY_LIMIT) return { ok: true };
  const available = Math.max(0, DAILY_LIMIT - sentLast24h);
  return {
    ok: false,
    available,
    message:
      `Límite diario alcanzado: en las últimas 24 horas se han enviado ${sentLast24h} ` +
      `correos y este envío necesita ${pending} más. Gmail permite unos 500 al día y ` +
      `la aplicación se detiene en ${DAILY_LIMIT} para no bloquear la cuenta. ` +
      `Quedan ${available} disponibles; inténtalo de nuevo más tarde.`,
  };
}

// Next batch of recipients that have no delivery row yet for this campaign.
// `remaining` counts every unhandled recipient, including this chunk.
export function nextChunk(
  recipients: string[],
  handled: Iterable<string>,
  size: number = CHUNK_SIZE,
): { chunk: string[]; remaining: number } {
  const done = new Set(handled);
  const pending = recipients.filter((email) => !done.has(email));
  return { chunk: pending.slice(0, size), remaining: pending.length };
}
