import type { DriveFile, DriveItem, DriveKind } from "./types";

// Drive API response -> view model. Drive data is untrusted text: names are
// rendered as plain text and only https links are kept.

const GOOGLE = "application/vnd.google-apps.";
export const FOLDER_MIME = `${GOOGLE}folder`;

export function driveKind(mimeType: string): DriveKind {
  if (mimeType === FOLDER_MIME) return "folder";
  if (
    mimeType === `${GOOGLE}document` ||
    mimeType === "application/msword" ||
    mimeType.includes("wordprocessingml") ||
    mimeType === "application/vnd.oasis.opendocument.text" ||
    mimeType === "text/plain"
  ) {
    return "doc";
  }
  if (
    mimeType === `${GOOGLE}spreadsheet` ||
    mimeType === "application/vnd.ms-excel" ||
    mimeType.includes("spreadsheetml") ||
    mimeType === "application/vnd.oasis.opendocument.spreadsheet" ||
    mimeType === "text/csv"
  ) {
    return "sheet";
  }
  if (
    mimeType === `${GOOGLE}presentation` ||
    mimeType === "application/vnd.ms-powerpoint" ||
    mimeType.includes("presentationml") ||
    mimeType === "application/vnd.oasis.opendocument.presentation"
  ) {
    return "slides";
  }
  if (mimeType === "application/pdf") return "pdf";
  if (mimeType.startsWith("image/") || mimeType === `${GOOGLE}drawing`) return "image";
  return "other";
}

const UNITS = ["B", "KB", "MB", "GB", "TB"];
const decimal = new Intl.NumberFormat("es-ES", { maximumFractionDigits: 1 });

export function formatBytes(bytes: number): string {
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < UNITS.length - 1) {
    value /= 1024;
    unit++;
  }
  return `${decimal.format(value)} ${UNITS[unit]}`;
}

const madrid = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/Madrid",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/** "dd/mm/yyyy HH:mm" in Europe/Madrid, or null. */
export function formatModified(iso: string | undefined): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  const parts = Object.fromEntries(madrid.formatToParts(date).map((p) => [p.type, p.value]));
  return `${parts.day}/${parts.month}/${parts.year} ${parts.hour}:${parts.minute}`;
}

function safeLink(url: string | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).protocol === "https:" ? url : null;
  } catch {
    return null;
  }
}

export function toDriveItem(file: DriveFile): DriveItem {
  const kind = driveKind(file.mimeType ?? "");
  const bytes = file.size === undefined ? NaN : Number(file.size);
  return {
    id: file.id,
    name: file.name?.trim() || "(sin nombre)",
    kind,
    modified: formatModified(file.modifiedTime),
    modifiedTime: file.modifiedTime ?? null,
    size: kind !== "folder" && Number.isFinite(bytes) ? formatBytes(bytes) : null,
    webViewLink: safeLink(file.webViewLink),
  };
}
