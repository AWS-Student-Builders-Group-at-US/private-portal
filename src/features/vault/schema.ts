import { z } from "zod";

// Decrypted item secrets. Only `label` and `category` are stored in plaintext;
// this object is JSON-encoded and encrypted as a whole.
export const vaultPayloadSchema = z.object({
  username: z.string().max(500).default(""),
  password: z.string().max(1000).default(""),
  url: z.string().max(2000).default(""),
  notes: z.string().max(5000).default(""),
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
