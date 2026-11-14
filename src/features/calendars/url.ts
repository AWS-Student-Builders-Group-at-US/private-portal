import { z } from "zod";

// SSRF guard: the only URLs the server ever fetches for busy times are Google
// Calendar "secret address in iCal format" links. Checked on the parsed URL
// (exact host, https, default port, no userinfo, path prefix), never by regex
// on the raw string.
const GOOGLE_HOST = "calendar.google.com";
const ICAL_PATH_PREFIX = "/calendar/ical/";

// Returns the normalized URL, or null when it is not a Google iCal address.
export function parseGoogleIcalUrl(value: string): string | null {
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    return null;
  }
  const ok =
    url.protocol === "https:" &&
    url.hostname === GOOGLE_HOST &&
    url.port === "" &&
    url.username === "" &&
    url.password === "" &&
    url.pathname.startsWith(ICAL_PATH_PREFIX) &&
    url.pathname.endsWith(".ics");
  return ok ? url.href : null;
}

export const googleIcalUrlSchema = z
  .string()
  .max(2000)
  .transform((value, ctx) => {
    const url = parseGoogleIcalUrl(value);
    if (!url) {
      ctx.addIssue({
        code: "custom",
        message:
          "Usa la «Dirección secreta en formato iCal» de Google Calendar (https://calendar.google.com/calendar/ical/…).",
      });
      return z.NEVER;
    }
    return url;
  });

// "https://calendar.google.com/calendar/ical/team…/••••/basic.ics"
export function maskIcsUrl(value: string) {
  const prefix = `https://${GOOGLE_HOST}${ICAL_PATH_PREFIX}`;
  const rest = value.startsWith(prefix) ? value.slice(prefix.length) : "";
  const segments = rest.split("/");
  const file = segments.length > 1 ? segments[segments.length - 1] : "";
  return `${prefix}${segments[0].slice(0, 4)}…/••••/${file}`;
}
