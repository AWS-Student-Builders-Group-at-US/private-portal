import { z } from "zod";

export const SUGGESTION_STATUSES = ["nueva", "aceptada", "descartada"] as const;
export type SuggestionStatus = (typeof SUGGESTION_STATUSES)[number];

export const SUGGESTION_STATUS_LABELS: Record<SuggestionStatus, string> = {
  nueva: "Nueva",
  aceptada: "Aceptada",
  descartada: "Descartada",
};

export const suggestionStatusSchema = z.enum(SUGGESTION_STATUSES, "Estado no válido.");

export const suggestionFormSchema = z.object({
  body: z
    .string("Escribe tu sugerencia.")
    .trim()
    .min(1, "Escribe tu sugerencia.")
    .max(2000, "La sugerencia admite como máximo 2000 caracteres."),
  anonymous: z.preprocess(
    (value) => value === "on" || value === "true" || value === true,
    z.boolean(),
  ),
});
