import { z } from "zod";

export const MEMBER_AREAS = ["organizacion", "tecnico", "comunicacion", "logistica", "otra"] as const;
export type MemberArea = (typeof MEMBER_AREAS)[number];

export const MEMBER_AREA_LABELS: Record<MemberArea, string> = {
  organizacion: "Organización",
  tecnico: "Técnico",
  comunicacion: "Comunicación",
  logistica: "Logística",
  otra: "Otra",
};

// Shows a known area with its label and any legacy value as stored.
export function memberAreaLabel(area: string | null): string {
  if (!area) return "Sin área";
  return MEMBER_AREA_LABELS[area as MemberArea] ?? area;
}

const emailSchema = z
  .string("Escribe un correo.")
  .trim()
  .toLowerCase()
  .pipe(z.email("Escribe un correo válido."));

const nameSchema = z
  .string("Escribe un nombre.")
  .trim()
  .min(1, "Escribe un nombre.")
  .max(80, "El nombre admite como máximo 80 caracteres.");

const areaSchema = z.enum(MEMBER_AREAS, "Elige un área.");

// Adding and editing use the same rules; the email identifies the member.
export const memberFormSchema = z.object({
  email: emailSchema,
  name: nameSchema,
  area: areaSchema,
});

export const memberUpdateSchema = memberFormSchema;

export const memberEmailSchema = emailSchema;

export type MemberFormValues = z.infer<typeof memberFormSchema>;
