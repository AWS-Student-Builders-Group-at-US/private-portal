import { z } from "zod";

export const MAX_CUSTOM_FIELDS = 20;
export const MAX_FIELD_NAME = 60;
export const MAX_FIELD_VALUE = 5000;

// Extra named values (e.g. OAuth client ID / client secret / redirect URI).
// `secret` values are masked in the list until revealed.
const customFieldSchema = z.object({
  name: z.string().min(1).max(MAX_FIELD_NAME),
  value: z.string().max(MAX_FIELD_VALUE),
  secret: z.boolean().default(false),
});

export type VaultCustomField = z.output<typeof customFieldSchema>;

// Decrypted item secrets. Only `label` and `category` are stored in plaintext;
// this object is JSON-encoded and encrypted as a whole. Every key has a
// default so payloads encrypted by older versions (e.g. without `fields`)
// still parse.
export const vaultPayloadSchema = z.object({
  username: z.string().max(500).default(""),
  password: z.string().max(1000).default(""),
  url: z.string().max(2000).default(""),
  notes: z.string().max(5000).default(""),
  fields: z.array(customFieldSchema).max(MAX_CUSTOM_FIELDS).default([]),
});

export type VaultPayload = z.output<typeof vaultPayloadSchema>;

const trimmed = (max: number, label: string) =>
  z.string().trim().max(max, `${label}: máximo ${max} caracteres.`).default("");

// Item editor input (form fields as strings) -> plaintext metadata + payload.
export const vaultItemFormSchema = z
  .object({
    label: z
      .string("El nombre es obligatorio.")
      .trim()
      .min(1, "El nombre es obligatorio.")
      .max(120, "El nombre admite como máximo 120 caracteres."),
    category: trimmed(60, "Categoría"),
    username: trimmed(500, "Usuario"),
    // Passwords are kept verbatim (leading/trailing spaces may be meaningful).
    password: z.string().max(1000, "La contraseña es demasiado larga.").default(""),
    url: trimmed(2000, "URL").refine(
      (url) => url === "" || z.url({ protocol: /^https?$/ }).safeParse(url).success,
      "Introduce una URL válida (https://…).",
    ),
    notes: trimmed(5000, "Notas"),
    fields: z
      .array(
        z.object({
          name: z
            .string()
            .trim()
            .min(1, "Cada campo adicional necesita un nombre.")
            .max(MAX_FIELD_NAME, `El nombre de un campo admite como máximo ${MAX_FIELD_NAME} caracteres.`),
          // Values are kept verbatim, like passwords.
          value: z
            .string()
            .max(MAX_FIELD_VALUE, `El valor de un campo admite como máximo ${MAX_FIELD_VALUE} caracteres.`),
          secret: z.boolean().default(false),
        }),
      )
      .max(MAX_CUSTOM_FIELDS, `Se admiten como máximo ${MAX_CUSTOM_FIELDS} campos adicionales.`)
      .default([]),
  })
  .transform(({ label, category, ...payload }) => ({
    label,
    category: category === "" ? null : category,
    payload,
  }));

/** Only http(s) URLs are opened from the vault list. */
export function isSafeUrl(url: string): boolean {
  return /^https?:\/\//i.test(url);
}
