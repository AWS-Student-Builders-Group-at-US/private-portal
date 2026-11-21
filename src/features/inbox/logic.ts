// Pure helpers for the read-only inbox of the group's common account.

export const PAGE_SIZE = 25;
const MAX_PAGE = 1000;
const MAX_SEARCH_LENGTH = 100;
const MAX_UID = 4_294_967_295; // IMAP UIDs are unsigned 32-bit integers.

// Blocks scripts, remote images (trackers), fonts and any network request.
export const INBOX_CSP =
  "default-src 'none'; img-src data:; style-src 'unsafe-inline'; font-src data:";

type Param = string | string[] | undefined;

const first = (value: Param) => (Array.isArray(value) ? value[0] : value);

// A message UID from the URL: a positive 32-bit integer without signs,
// spaces or leading zeros, or null.
export function parseUid(value: string | undefined): number | null {
  if (!value || !/^[1-9]\d{0,9}$/.test(value)) return null;
  const uid = Number(value);
  return uid <= MAX_UID ? uid : null;
}

export function parsePage(value: Param): number {
  const raw = first(value);
  if (!raw || !/^\d+$/.test(raw)) return 1;
  const page = Number(raw);
  if (page < 1) return 1;
  return Math.min(page, MAX_PAGE);
}

export function normalizeSearch(value: Param): string | null {
  const query = first(value)?.replace(/\s+/g, " ").trim();
  return query ? query.slice(0, MAX_SEARCH_LENGTH) : null;
}

// Newest first: the page of UIDs to fetch and whether older ones remain.
export function pageOfUids(uids: number[], page: number, size = PAGE_SIZE) {
  const newestFirst = [...uids].sort((a, b) => b - a);
  const start = (page - 1) * size;
  return {
    uids: newestFirst.slice(start, start + size),
    hasOlder: newestFirst.length > start + size,
  };
}

export type Address = { name?: string; address?: string };

export function formatAddress(value: Address | undefined): string {
  const name = value?.name?.trim();
  const address = value?.address?.trim();
  if (name && address) return `${name} <${address}>`;
  return name || address || "Desconocido";
}

export function formatAddressList(values: Address[] | undefined): string {
  return (values ?? []).map(formatAddress).join(", ");
}

export function formatBytes(bytes: number | undefined): string {
  if (bytes === undefined || !Number.isFinite(bytes)) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${Math.round((bytes / (1024 * 1024)) * 10) / 10} MB`;
}

// The email's HTML for an <iframe sandbox="" srcDoc>: the CSP meta goes first
// so it applies before any of the email's own markup (a later CSP can only
// restrict further). The empty sandbox also disables scripts, forms, popups
// and navigation.
export function buildSandboxedHtml(html: string): string {
  return `<!doctype html><meta http-equiv="Content-Security-Policy" content="${INBOX_CSP}"><meta charset="utf-8"><base target="_blank">${html}`;
}

// The common account's own address never reaches the browser: it shows up
// as a label instead (it is usually the "To" of every message).
export function maskCommonAccount(values: Address[], account: string | undefined): Address[] {
  const own = account?.trim().toLowerCase();
  if (!own) return values;
  return values.map((value) =>
    value.address?.trim().toLowerCase() === own ? { name: "Cuenta común" } : value,
  );
}

// Case-insensitive substring match on subject or sender, like IMAP
// `SEARCH OR SUBJECT <q> FROM <q>` (FROM matches the name and the address).
export function matchesSearch(
  message: { subject: string; from: Address[] },
  query: string,
): boolean {
  const needle = query.toLowerCase();
  const haystacks = [
    message.subject,
    ...message.from.flatMap((sender) => [sender.name ?? "", sender.address ?? ""]),
  ];
  return haystacks.some((value) => value.toLowerCase().includes(needle));
}

// Local sample emails (src/features/inbox/fixtures.ts) instead of IMAP: only
// with INBOX_FIXTURES=1 and never in a production build or deployment.
export function isFixtureMode(env: Record<string, string | undefined>): boolean {
  return (
    env.INBOX_FIXTURES === "1" &&
    env.NODE_ENV !== "production" &&
    env.VERCEL_ENV !== "production"
  );
}

// --- Mail client presentation helpers ---------------------------------

const TIME_ZONE = "Europe/Madrid";
const SHORT_MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

const madridParts = new Intl.DateTimeFormat("en-US", {
  timeZone: TIME_ZONE,
  hourCycle: "h23",
  year: "numeric",
  month: "numeric",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function partsInMadrid(date: Date) {
  const values: Record<string, string> = {};
  for (const part of madridParts.formatToParts(date)) values[part.type] = part.value;
  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
    hour: values.hour,
    minute: values.minute,
  };
}

const pad = (value: number) => String(value).padStart(2, "0");

// List date in Madrid time: "14:32" today, "12 nov" this year, "12/11/2025" before.
export function formatInboxDate(iso: string | null, now: Date): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const at = partsInMadrid(date);
  const today = partsInMadrid(now);
  if (at.year === today.year && at.month === today.month && at.day === today.day) {
    return `${at.hour}:${at.minute}`;
  }
  if (at.year === today.year) return `${at.day} ${SHORT_MONTHS[at.month - 1]}`;
  return `${pad(at.day)}/${pad(at.month)}/${at.year}`;
}

const words = (value: string | null | undefined) => value?.match(/[\p{L}\p{N}]+/gu) ?? [];

// "Amazon Web Services" -> "AW"; "Meetup" -> "M"; "no-reply@x" -> "NR".
export function senderInitials(name: string | null | undefined, address?: string | null): string {
  let parts = words(name);
  if (parts.length === 0) parts = words(address?.split("@")[0]);
  if (parts.length === 0) return "?";
  return parts
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

export const AVATAR_TONE_COUNT = 6;

// Deterministic palette index for a sender (same sender, same color).
export function avatarTone(seed: string): number {
  let hash = 5381;
  for (const char of seed.toLowerCase()) hash = (hash * 33 + char.codePointAt(0)!) >>> 0;
  return hash % AVATAR_TONE_COUNT;
}

const AWS_LABELS = new Set(["aws", "amazon", "amazonaws"]);

// Whether the sender's domain belongs to Amazon/AWS: the registrable label
// (the one before the TLD, or before "co.uk"-style suffixes) must be aws,
// amazon or amazonaws, so "aws.evil.com" or "notaws.com" do not count. It is
// a visual hint from the From header, not a verification of the sender.
export function isAwsSender(address: string | null | undefined): boolean {
  const at = address?.lastIndexOf("@") ?? -1;
  if (!address || at < 0) return false;
  const labels = address.slice(at + 1).trim().toLowerCase().split(".");
  if (labels.length < 2 || labels.some((label) => !label)) return false;
  const tld = labels[labels.length - 1];
  const secondLevel = labels[labels.length - 2];
  const index =
    labels.length >= 3 && tld.length === 2 && (secondLevel === "co" || secondLevel === "com")
      ? labels.length - 3
      : labels.length - 2;
  return AWS_LABELS.has(labels[index]);
}

const recipientLabel = (value: Address) =>
  value.name?.trim() || value.address?.trim() || "Desconocido";

// "Ana, Luis y 3 más": the first `visible` recipients and a count of the rest.
export function summarizeRecipients(values: Address[] | undefined, visible = 2): string {
  const list = values ?? [];
  const shown = list.slice(0, visible).map(recipientLabel).join(", ");
  const rest = list.length - visible;
  return rest > 0 ? `${shown} y ${rest} más` : shown;
}

// "26–50 de 60" for the current page, or "" when nothing is shown.
export function formatRange(page: number, shown: number, total: number, size = PAGE_SIZE): string {
  if (shown <= 0) return "";
  const start = (page - 1) * size + 1;
  return `${start}–${start + shown - 1} de ${total}`;
}

// Inbox URLs keep the search and page so the list stays put while reading.
export function inboxHref({
  page,
  query,
  uid = null,
}: {
  page: number;
  query: string | null;
  uid?: number | null;
}): string {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  if (page > 1) params.set("pagina", String(page));
  const search = params.toString();
  const path = uid === null ? "/panel/correo" : `/panel/correo/${uid}`;
  return search ? `${path}?${search}` : path;
}
