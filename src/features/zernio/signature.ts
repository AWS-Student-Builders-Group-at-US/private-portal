import { createHmac, timingSafeEqual } from "node:crypto";

const HEX_SHA256 = /^[0-9a-f]{64}$/;

/**
 * True only when `signature` (the `X-Zernio-Signature` header) is the
 * lowercase hex HMAC-SHA256 of the raw request body keyed with `secret`.
 * A missing secret or signature rejects every request. Lengths are checked
 * first (timingSafeEqual throws on mismatch); the comparison itself is
 * constant time.
 */
export function verifyZernioSignature(
  rawBody: string,
  signature: string | null | undefined,
  secret: string | undefined,
): boolean {
  if (!secret || !signature || !HEX_SHA256.test(signature)) return false;
  const expected = createHmac("sha256", secret).update(rawBody, "utf8").digest();
  const given = Buffer.from(signature, "hex");
  return given.length === expected.length && timingSafeEqual(given, expected);
}
