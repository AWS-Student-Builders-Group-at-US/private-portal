import { z } from "zod";
import { isValidMadridLocal, madridLocalToUtcIso } from "./time";

// Trims strings; blank values become null.
function blankToNull(value: unknown) {
  if (typeof value !== "string") return value ?? null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

const optionalText = (max: number, label: string) =>
  z.preprocess(
    blankToNull,
    z
      .string()
      .max(max, `${label}: máximo ${max} caracteres.`)
      .nullable(),
  );

const localDateTime = (message: string) =>
  z
    .string(message)
    .trim()
    .min(1, message)
    .refine(isValidMadridLocal, "La fecha no es válida.");

// Shared by the create and update server actions. Input: form fields as strings
// (times are Europe/Madrid `datetime-local` values). Output: an `events` row.
export const eventFormSchema = z
  .object({
    title: z
      .string("El título es obligatorio.")
      .trim()
      .min(1, "El título es obligatorio.")
      .max(200, "El título admite como máximo 200 caracteres."),
    description: optionalText(5000, "Descripción"),
    starts_at: localDateTime("Indica la fecha y hora de inicio."),
    ends_at: z.preprocess(
      blankToNull,
      localDateTime("La fecha de fin no es válida.").nullable(),
    ),
    location: optionalText(300, "Lugar"),
    meetup_url: z.preprocess(
      blankToNull,
      z
        .url({
          protocol: /^https?$/,
          error: "Introduce una URL válida (https://…).",
        })
        .max(500, "La URL es demasiado larga.")
        .nullable(),
    ),
    expected_attendees: z.preprocess(
      (value) => {
        const cleaned = blankToNull(value);
        return typeof cleaned === "string" ? Number(cleaned) : cleaned;
      },
      z
        .number("Indica un número de asistentes.")
        .int("Indica un número entero de asistentes.")
        .min(0, "Los asistentes previstos no pueden ser negativos.")
        .max(100000, "El número de asistentes es demasiado alto.")
        .nullable(),
    ),
    is_public: z.preprocess(
      (value) => value === "on" || value === "true" || value === true,
      z.boolean(),
    ),
    // Blank means "use the default check-in form".
    checkin_form_id: z.preprocess(
      blankToNull,
      z.uuid("Elige un formulario de registro válido.").nullable(),
    ),
  })
  .refine(
    (event) =>
      !event.ends_at ||
      // Field errors are reported by the fields; skip the comparison then.
      !isValidMadridLocal(event.starts_at) ||
      !isValidMadridLocal(event.ends_at) ||
      madridLocalToUtcIso(event.ends_at) >= madridLocalToUtcIso(event.starts_at),
    {
      // ISO UTC strings compare chronologically (mirrors the DB check).
      message: "La fecha de fin no puede ser anterior al inicio.",
      path: ["ends_at"],
    },
  )
  .transform((event) => ({
    ...event,
    starts_at: madridLocalToUtcIso(event.starts_at),
    ends_at: event.ends_at ? madridLocalToUtcIso(event.ends_at) : null,
  }));

export type EventRowInput = z.output<typeof eventFormSchema>;

// Client-side upload limit; matches the `event-files` bucket file_size_limit.
export const MAX_EVENT_FILE_BYTES = 50 * 1024 * 1024;
