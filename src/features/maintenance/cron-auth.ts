import { createHash, timingSafeEqual } from "node:crypto";

const sha256 = (value: string) => createHash("sha256").update(value, "utf8").digest();

/**
 * True only when `headerValue` is exactly `Bearer <secret>` (the header Vercel
 * Cron sends when `CRON_SECRET` is set). A missing or empty secret rejects
 * every request. Both sides are hashed first so the comparison is constant
 * time regardless of their lengths.
 */
export function isAuthorizedCron(
  headerValue: string | null | undefined,
  secret: string | undefined,
): boolean {
  if (!secret || !headerValue) return false;
  return timingSafeEqual(sha256(headerValue), sha256(`Bearer ${secret}`));
}
