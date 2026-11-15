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
