import { z } from "zod";

// Checked checkboxes submit "on"; unchecked ones are absent from FormData.
const checkbox = z.preprocess(
  (value) => value === "on" || value === "true" || value === true,
  z.boolean(),
);

// Rules for the fixed check-in fields (their own `attendees` columns). The
// dynamic validator (`@/features/checkin-forms/answers`) reuses them.
export const checkinFormSchema = z.object({
  name: z
    .string("Indica tu nombre.")
    .trim()
    .min(2, "El nombre debe tener al menos 2 caracteres.")
    .max(100, "El nombre admite como máximo 100 caracteres."),
  email: z
    .string("Indica tu correo electrónico.")
    .trim()
    .toLowerCase()
    .max(254, "El correo es demasiado largo.")
    .pipe(z.email("Introduce un correo electrónico válido.")),
  photo_consent: checkbox,
  email_consent: checkbox,
});

export type CheckinInput = z.output<typeof checkinFormSchema>;
