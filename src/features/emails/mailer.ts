import "server-only";
import nodemailer from "nodemailer";
import { SENDER_NAME } from "./compose";

// Gmail SMTP with an app password. Credentials are server-only env vars and
// are never logged. The transport is created per call (pooled within it) and
// closed by the caller.

export function getMailerConfig() {
  const user = process.env.GMAIL_USER?.trim();
  const pass = process.env.GMAIL_APP_PASSWORD;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  // The site URL is required: unsubscribe links must never be built from a
  // (spoofable) request Host header.
  if (!user || !pass || !siteUrl) return null;
  return { user, pass, siteUrl };
}

export function createGmailTransport({ user, pass }: { user: string; pass: string }) {
  return nodemailer.createTransport({
    service: "gmail",
    pool: true,
    maxConnections: 3,
    auth: { user, pass },
  });
}

export function senderAddress(user: string) {
  return { name: SENDER_NAME, address: user };
}
