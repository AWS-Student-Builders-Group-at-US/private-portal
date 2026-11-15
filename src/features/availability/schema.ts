import { z } from "zod";
import { isValidIsoDate } from "./dates";
import { DAY_END, DAY_START, SLOT_MINUTES, addDays } from "./slots";

export const NOTE_TITLE_MAX = 120;
export const NOTE_BODY_MAX = 2000;
// A note spans at most this many days (inclusive range).
export const NOTE_MAX_DAYS = 31;

const isoDate = (message: string) =>
  z.string(message).trim().refine(isValidIsoDate, message);

// A slot boundary of the visible grid (08:00 … 22:00, every 30 minutes).
const gridMinute = (message: string) =>
  z.coerce
    .number(message)
    .int(message)
    .min(DAY_START, message)
    .max(DAY_END, message)
    .refine((minute) => (minute - DAY_START) % SLOT_MINUTES === 0, message);

const noteText = {
  title: z
    .string("Escribe un título.")
    .trim()
    .min(1, "Escribe un título.")
    .max(NOTE_TITLE_MAX, `El título admite como máximo ${NOTE_TITLE_MAX} caracteres.`),
  body: z
    .string()
    .trim()
    .max(NOTE_BODY_MAX, `El contenido admite como máximo ${NOTE_BODY_MAX} caracteres.`)
    .optional()
    .transform((body) => body ?? ""),
};

// A new note: the selected rectangle plus its text.
export const noteFormSchema = z
  .object({
    start_date: isoDate("La fecha de inicio no es válida."),
    end_date: isoDate("La fecha de fin no es válida."),
    start_minute: gridMinute("La hora de inicio no es válida."),
    end_minute: gridMinute("La hora de fin no es válida."),
    ...noteText,
  })
  .refine((note) => note.end_date >= note.start_date, {
    message: "La fecha de fin no puede ser anterior a la de inicio.",
    path: ["end_date"],
  })
  .refine((note) => note.end_date <= addDays(note.start_date, NOTE_MAX_DAYS - 1), {
    message: `Una nota abarca como máximo ${NOTE_MAX_DAYS} días.`,
    path: ["end_date"],
  })
  .refine((note) => note.end_minute > note.start_minute, {
    message: "La hora de fin debe ser posterior a la de inicio.",
    path: ["end_minute"],
  });

export type NoteInput = z.output<typeof noteFormSchema>;

// Editing a note changes only its title and content.
export const noteTextSchema = z.object(noteText);
