import { utcIsoToMadridLocal } from "@/features/events/time";
import type { Attendee } from "./types";

export const ATTENDEES_CSV_HEADER = [
  "Nombre",
  "Email",
  "Consentimiento fotos",
  "Consentimiento correos",
  "Registro (Europe/Madrid)",
];

// RFC 4180 quoting. Values starting with = + - @ (or tab/CR) get a leading
// apostrophe so spreadsheet apps do not run attendee-provided text as formulas.
export function escapeCsvField(value: string) {
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /[",\r\n]/.test(safe) ? `"${safe.replaceAll('"', '""')}"` : safe;
}

export const FORM_VERSION_HEADER = "Versión del formulario";

type CsvAttendee = Pick<
  Attendee,
  "name" | "email" | "photo_consent" | "email_consent" | "checked_in_at" | "answers"
> & { form_version: number | null };

const yesNo = (value: boolean) => (value ? "sí" : "no");

export function formatAnswer(value: unknown) {
  if (typeof value === "boolean") return yesNo(value);
  return value === null || value === undefined ? "" : String(value);
}

// UTF-8 BOM so Excel detects the encoding (accents), CRLF line endings.
// Extra answers get one column per key found in these attendees, labelled
// with `labels[key]` (latest form version defining it) or the key itself.
export function attendeesToCsv(
  attendees: CsvAttendee[],
  labels: Record<string, string> = {},
) {
  const extraKeys = [
    ...new Set(attendees.flatMap((attendee) => Object.keys(attendee.answers ?? {}))),
  ];
  const rows = [
    [...ATTENDEES_CSV_HEADER, ...extraKeys.map((key) => labels[key] ?? key), FORM_VERSION_HEADER],
    ...attendees.map((attendee) => [
      attendee.name,
      attendee.email,
      yesNo(attendee.photo_consent),
      yesNo(attendee.email_consent),
      utcIsoToMadridLocal(attendee.checked_in_at).replace("T", " "),
      ...extraKeys.map((key) => formatAnswer(attendee.answers?.[key])),
      attendee.form_version === null ? "" : String(attendee.form_version),
    ]),
  ];
  return `\uFEFF${rows.map((row) => row.map(escapeCsvField).join(",")).join("\r\n")}\r\n`;
}
