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

type CsvAttendee = Pick<
  Attendee,
  "name" | "email" | "photo_consent" | "email_consent" | "checked_in_at"
>;

// UTF-8 BOM so Excel detects the encoding (accents), CRLF line endings.
export function attendeesToCsv(attendees: CsvAttendee[]) {
  const yesNo = (value: boolean) => (value ? "sí" : "no");
  const rows = [
    ATTENDEES_CSV_HEADER,
    ...attendees.map((attendee) => [
      attendee.name,
      attendee.email,
      yesNo(attendee.photo_consent),
      yesNo(attendee.email_consent),
      utcIsoToMadridLocal(attendee.checked_in_at).replace("T", " "),
    ]),
  ];
  return `﻿${rows.map((row) => row.map(escapeCsvField).join(",")).join("\r\n")}\r\n`;
}
