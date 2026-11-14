import { z } from "zod";

// Check-in form definition stored in `checkin_forms.fields` (jsonb).
// Pure module: shared by the panel editor, the public form and the exports.

export const FIELD_TYPES = ["text", "email", "select", "checkbox"] as const;
export type FieldType = (typeof FIELD_TYPES)[number];

export type FormField = {
  key: string;
  type: FieldType;
  label: string;
  required: boolean;
  options?: string[];
  help?: string;
};

// Keys stored in their own `attendees` columns. They always exist with these
// types; only label and help are editable. Everything else goes to `answers`.
export const FIXED_FIELDS = {
  name: { type: "text", required: true },
  email: { type: "email", required: true },
  photo_consent: { type: "checkbox", required: false },
  email_consent: { type: "checkbox", required: false },
} as const satisfies Record<string, { type: FieldType; required: boolean }>;

export type FixedKey = keyof typeof FIXED_FIELDS;

export function isFixedKey(key: string): key is FixedKey {
  return Object.hasOwn(FIXED_FIELDS, key);
}

export const MAX_FIELDS = 20;
export const MAX_OPTIONS = 20;
export const FIELD_KEY_PATTERN = /^[a-z][a-z0-9_]{1,39}$/;

// Version 1 of the form (also seeded by the migration).
export const DEFAULT_CHECKIN_FIELDS: FormField[] = [
  { key: "name", type: "text", label: "Nombre", required: true },
  { key: "email", type: "email", label: "Correo electrónico", required: true },
  {
    key: "photo_consent",
    type: "checkbox",
    label: "Acepto aparecer en fotos y vídeos del evento",
    required: false,
  },
  {
    key: "email_consent",
    type: "checkbox",
    label: "Quiero recibir correos sobre próximos eventos",
    required: false,
  },
];

const fieldSchema = z
  .object({
    key: z
      .string()
      .regex(
        FIELD_KEY_PATTERN,
        "La clave debe empezar por una letra minúscula y usar solo a-z, 0-9 y _ (2-40 caracteres).",
      ),
    type: z.enum(FIELD_TYPES, "Tipo de campo no válido."),
    label: z
      .string()
      .trim()
      .min(1, "Cada campo necesita una etiqueta.")
      .max(200, "La etiqueta admite como máximo 200 caracteres."),
    required: z.boolean(),
    options: z
      .array(z.string().trim().min(1, "Las opciones no pueden estar vacías.").max(100))
      .optional(),
    help: z
      .string()
      .trim()
      .max(300, "La ayuda admite como máximo 300 caracteres.")
      .optional()
      .transform((value) => value || undefined),
  })
  // Options only make sense for selects; drop leftovers from a type change.
  .transform(({ options, help, ...field }): FormField => ({
    ...field,
    ...(field.type === "select" ? { options } : {}),
    ...(help ? { help } : {}),
  }));

export const formFieldsSchema = z
  .array(fieldSchema)
  .max(MAX_FIELDS, `El formulario admite como máximo ${MAX_FIELDS} campos.`)
  .superRefine((fields, ctx) => {
    const issue = (message: string, index?: number) =>
      ctx.addIssue({
        code: "custom",
        message,
        path: index === undefined ? [] : [index],
      });

    const seen = new Set<string>();
    fields.forEach((field, index) => {
      if (seen.has(field.key)) issue(`La clave «${field.key}» está repetida.`, index);
      seen.add(field.key);

      if (isFixedKey(field.key)) {
        const fixed = FIXED_FIELDS[field.key];
        if (field.type !== fixed.type || field.required !== fixed.required) {
          issue(`El campo «${field.key}» no se puede cambiar de tipo ni de obligatoriedad.`, index);
        }
      }
      if (field.type === "checkbox" && field.required) {
        issue(`La casilla «${field.key}» no puede ser obligatoria.`, index);
      }
      if (field.type === "select") {
        const options = field.options ?? [];
        if (options.length < 1 || options.length > MAX_OPTIONS) {
          issue(`El desplegable «${field.key}» necesita entre 1 y ${MAX_OPTIONS} opciones.`, index);
        } else if (new Set(options).size !== options.length) {
          issue(`El desplegable «${field.key}» tiene opciones repetidas.`, index);
        }
      }
    });

    for (const key of Object.keys(FIXED_FIELDS)) {
      if (!seen.has(key)) issue(`Falta el campo obligatorio «${key}».`);
    }
  });

// Everything a member edits in the panel; one publish = one new version.
export const checkinFormContentSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Indica un título.")
    .max(120, "El título admite como máximo 120 caracteres."),
  intro: z
    .string()
    .trim()
    .max(1000, "La introducción admite como máximo 1000 caracteres.")
    .default(""),
  fields: formFieldsSchema,
  privacy_notice: z
    .string()
    .trim()
    .min(1, "Indica la política de privacidad.")
    .max(20000, "La política de privacidad admite como máximo 20000 caracteres."),
});

export type CheckinFormContent = z.output<typeof checkinFormContentSchema>;

// Label for every extra (non-fixed) key, taken from the latest version that
// defines it. Used for exports and attendee lists across versions.
export function latestFieldLabels(
  versions: { version: number; fields: FormField[] }[],
): Record<string, string> {
  const labels: Record<string, string> = {};
  const newestFirst = [...versions].sort((a, b) => b.version - a.version);
  for (const { fields } of newestFirst) {
    for (const field of fields) {
      if (!isFixedKey(field.key) && !(field.key in labels)) {
        labels[field.key] = field.label;
      }
    }
  }
  return labels;
}
