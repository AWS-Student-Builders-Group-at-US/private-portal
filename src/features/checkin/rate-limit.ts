import { createHash } from "node:crypto";

// Public check-in limiter: at most CHECKIN_MAX_ATTEMPTS submissions per
// hashed IP within CHECKIN_WINDOW_SECONDS.
export const CHECKIN_MAX_ATTEMPTS = 5;
export const CHECKIN_WINDOW_SECONDS = 60;

// Shared bucket for requests without an IP header, so the limiter still applies.
export const UNKNOWN_IP = "unknown";

// `attempts` = earlier attempts from the same IP inside the window.
export function isRateLimited(attempts: number, limit = CHECKIN_MAX_ATTEMPTS) {
  return attempts >= limit;
}

type HeaderReader = { get(name: string): string | null };

// Client IP as reported by the hosting proxy (Vercel sets both headers).
export function getClientIp(headers: HeaderReader): string {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (forwarded) return forwarded;
  const realIp = headers.get("x-real-ip")?.trim();
  return realIp || UNKNOWN_IP;
}

// Only salted hashes are stored; raw IPs never reach the database.
export function hashIp(ip: string, salt: string) {
  return createHash("sha256").update(`${ip}${salt}`).digest("hex");
}
