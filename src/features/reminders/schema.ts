import { z } from "zod";
import { isValidIsoDate } from "@/features/availability/dates";

export const REMINDER_TITLE_MAX = 200;
export const REMINDER_NOTE_MAX = 2000;

// A free reminder from the form. `today` (Madrid) is the earliest date: the
// cron only sends pending reminders up to a week late, never back in time.
export function reminderFormSchema(today: string) {
  return z.object({
    title: z
      .string("Escribe qué quieres recordar.")
      .trim()
      .min(1, "Escribe qué quieres recordar.")
      .max(REMINDER_TITLE_MAX, `Máximo ${REMINDER_TITLE_MAX} caracteres.`),
    remind_on: z
      .string("La fecha no es válida.")
      .trim()
      .refine(isValidIsoDate, "La fecha no es válida.")
      .refine((date) => date >= today, "Elige hoy o una fecha futura."),
    note: z
      .string()
      .trim()
      .max(REMINDER_NOTE_MAX, `La nota admite como máximo ${REMINDER_NOTE_MAX} caracteres.`)
      .optional()
      .transform((note) => (note ? note : null)),
  });
}

export type ReminderInput = z.output<ReturnType<typeof reminderFormSchema>>;
