import { z } from "zod";
import { isValidIsoDate } from "./dates";

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$|^24:00$/;

const time = (message: string) =>
  z.string(message).trim().regex(TIME_PATTERN, message);

const endAfterStart = (range: { start_time: string; end_time: string }) =>
  range.end_time > range.start_time;

// A one-off change for a specific date ("Cambios por fecha").
export const overrideFormSchema = z
  .object({
    date: z
      .string("Indica la fecha.")
      .trim()
      .refine(isValidIsoDate, "La fecha no es válida."),
    start_time: time("Indica una hora de inicio válida."),
    end_time: time("Indica una hora de fin válida."),
    kind: z.enum(["free", "busy"], "Elige libre u ocupado."),
  })
  .refine(endAfterStart, {
    message: "La hora de fin debe ser posterior a la de inicio.",
    path: ["end_time"],
  });

export type OverrideInput = z.output<typeof overrideFormSchema>;

// The whole weekly template, saved at once from the painted grid.
export const templateRangesSchema = z
  .array(
    z
      .object({
        weekday: z.number().int().min(0).max(6),
        start_time: z.string().regex(TIME_PATTERN),
        end_time: z.string().regex(TIME_PATTERN),
      })
      .refine(endAfterStart),
  )
  .max(7 * 28);
