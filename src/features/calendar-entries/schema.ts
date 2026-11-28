import { z } from "zod";
import { isValidIsoDate } from "@/features/availability/dates";
import { madridLocalToUtcIso } from "@/features/events/time";

export const ENTRY_TITLE_MAX = 120;
export const ENTRY_NOTES_MAX = 2000;
export const ENTRY_MEETING_URL_MAX = 500;
export const ENTRY_VISIBILITIES = ["details", "busy"] as const;

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

const time = (message: string) =>
  z.string(message).trim().regex(TIME_PATTERN, message);

// A calendar entry from the form: one Madrid date with a start and end time
// (same day). Group meetings are always shown with details.
export const entryFormSchema = z
  .object({
    title: z
      .string("Escribe un título.")
      .trim()
      .min(1, "Escribe un título.")
      .max(ENTRY_TITLE_MAX, `El título admite como máximo ${ENTRY_TITLE_MAX} caracteres.`),
    date: z
      .string("La fecha no es válida.")
      .trim()
      .refine(isValidIsoDate, "La fecha no es válida."),
    start_time: time("La hora de inicio no es válida."),
    end_time: time("La hora de fin no es válida."),
    notes: z
      .string()
      .trim()
      .max(ENTRY_NOTES_MAX, `Las notas admiten como máximo ${ENTRY_NOTES_MAX} caracteres.`)
      .optional(),
    // Video call link (group meetings only; ignored otherwise).
    meeting_url: z
      .string()
      .trim()
      .max(ENTRY_MEETING_URL_MAX, `El enlace admite como máximo ${ENTRY_MEETING_URL_MAX} caracteres.`)
      .refine(
        (url) => url === "" || z.url({ protocol: /^https?$/ }).safeParse(url).success,
        "Escribe un enlace que empiece por https://.",
      )
      .optional(),
    visibility: z.enum(ENTRY_VISIBILITIES, "Elige qué ven los demás."),
    // Checkbox: present ("on") when checked.
    is_group_meeting: z.string().optional(),
  })
  .refine((entry) => entry.end_time > entry.start_time, {
    message: "La hora de fin debe ser posterior a la de inicio.",
    path: ["end_time"],
  })
  .transform((entry) => {
    const groupMeeting = entry.is_group_meeting !== undefined;
    return {
      title: entry.title,
      notes: entry.notes ? entry.notes : null,
      starts_at: madridLocalToUtcIso(`${entry.date}T${entry.start_time}`),
      ends_at: madridLocalToUtcIso(`${entry.date}T${entry.end_time}`),
      visibility: groupMeeting ? ("details" as const) : entry.visibility,
      is_group_meeting: groupMeeting,
      // Only sent for group meetings, so personal entries keep saving even
      // where the meeting_url column does not exist yet.
      ...(groupMeeting ? { meeting_url: entry.meeting_url ? entry.meeting_url : null } : {}),
    };
  });

export type EntryInput = z.output<typeof entryFormSchema>;
