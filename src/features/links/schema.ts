import { z } from "zod";

function blankToNull(value: unknown) {
  if (typeof value !== "string") return value ?? null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

export const linkFormSchema = z.object({
  title: z
    .string("El título es obligatorio.")
    .trim()
    .min(1, "El título es obligatorio.")
    .max(200, "El título admite como máximo 200 caracteres."),
  url: z.preprocess(
    (value) => {
      const cleaned = blankToNull(value);
      // "aws.amazon.com" -> "https://aws.amazon.com"; other schemes stay as typed.
      return typeof cleaned === "string" && !/^[a-z][a-z0-9+.-]*:/i.test(cleaned)
        ? `https://${cleaned}`
        : cleaned;
    },
    z.url({ protocol: /^https?$/, error: "Introduce una URL válida (https://…)." })
      .max(2000, "La URL es demasiado larga."),
  ),
  category: z.preprocess(
    blankToNull,
    z.string().max(60, "Categoría: máximo 60 caracteres.").nullable(),
  ),
  notes: z.preprocess(
    blankToNull,
    z.string().max(2000, "Notas: máximo 2000 caracteres.").nullable(),
  ),
});

export type LinkRowInput = z.output<typeof linkFormSchema>;
