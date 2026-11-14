// Public check-in URL encoded in the QR code.
export function buildCheckinUrl(baseUrl: string, token: string) {
  return `${baseUrl.replace(/\/+$/, "")}/checkin/${encodeURIComponent(token)}`;
}

type HeaderReader = { get(name: string): string | null };

// Base URL for QR links: NEXT_PUBLIC_SITE_URL, else the request origin.
// Only used on member-only pages and routes.
export function resolveSiteUrl(headers: HeaderReader) {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configured) return configured;
  const host = headers.get("x-forwarded-host") ?? headers.get("host");
  const proto =
    headers.get("x-forwarded-proto") ??
    (host?.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host ?? "localhost:3000"}`;
}
