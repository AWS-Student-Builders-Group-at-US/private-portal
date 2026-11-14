import { z } from "zod";
import { checkinFormSchema } from "@/features/checkin/schema";
import { isFixedKey, type FormField } from "./definition";

// Builds the validator for an attendee's submission from a form definition.

const REQUIRED = "Este campo es obligatorio.";

const emailSchema = z
  .string(REQUIRED)
  .trim()
  .toLowerCase()
  .max(254, "El correo es demasiado largo.")
  .pipe(z.email("Introduce un correo electrónico válido."));

// Checked checkboxes submit "on"; unchecked ones are absent from FormData.
const checkboxSchema = z.preprocess(
  (value) => value === "on" || value === "true" || value === true,
  z.boolean(),
);

// Optional fields left blank become undefined (not stored).
const blankToUndefined = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

function valueSchema(field: FormField): z.ZodType {
  if (field.key === "name" || field.key === "email") {
    return checkinFormSchema.shape[field.key];
  }
  if (field.type === "checkbox") return checkboxSchema;

  const base =
    field.type === "email"
      ? emailSchema
      : field.type === "select"
        ? z.enum(field.options as [string, ...string[]], "Elige una opción de la lista.")
        : z.string(REQUIRED).trim().min(1, REQUIRED).max(500, "Máximo 500 caracteres.");
  if (field.required) {
    return field.type === "select" ? z.preprocess(blankToUndefined, base) : base;
  }
  return z.preprocess(blankToUndefined, base.optional());
}

// Unknown keys are stripped (zod's default for objects).
export function buildAnswersSchema(fields: FormField[]) {
  return z.object(
    Object.fromEntries(fields.map((field) => [field.key, valueSchema(field)])),
  );
}

export type AnswerValue = string | boolean;

type FormDataReader = { get(name: string): FormDataEntryValue | null };

// Raw string values for the defined keys only (used to refill the form).
export function readFormValues(fields: FormField[], formData: FormDataReader) {
  const values: Record<string, string> = {};
  for (const { key, type } of fields) {
    const raw = formData.get(key);
    values[key] =
      type === "checkbox"
        ? raw === "on"
          ? "on"
          : ""
        : typeof raw === "string"
          ? raw
          : "";
  }
  return values;
}

// Fixed keys go to their own columns; the rest to `attendees.answers`.
export function toAttendeeColumns(parsed: Record<string, unknown>) {
  const answers: Record<string, AnswerValue> = {};
  for (const [key, value] of Object.entries(parsed)) {
    if (!isFixedKey(key) && (typeof value === "string" || typeof value === "boolean")) {
      answers[key] = value;
    }
  }
  return {
    name: parsed.name as string,
    email: parsed.email as string,
    photo_consent: parsed.photo_consent === true,
    email_consent: parsed.email_consent === true,
    answers,
  };
}
