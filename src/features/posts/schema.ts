import { z } from "zod";
import { isValidMadridLocal, madridLocalToUtcIso } from "@/features/events/time";
import { slugify } from "./content";

export const POST_TARGETS = ["web", "linkedin", "instagram"] as const;
export type PostTarget = (typeof POST_TARGETS)[number];

export const POST_TARGET_LABELS: Record<PostTarget, string> = {
  web: "Web",
  linkedin: "LinkedIn",
  instagram: "Instagram",
};

export const POST_STATUSES = ["draft", "review", "approved", "published"] as const;
export type PostStatus = (typeof POST_STATUSES)[number];

export const POST_STATUS_LABELS: Record<PostStatus, string> = {
  draft: "Borrador",
  review: "En revisión",
  approved: "Aprobada",
  published: "Publicada",
};

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const IMAGE_PATH_PATTERN = /^posts\/[A-Za-z0-9._-]+$/;

function blankToNull(value: unknown) {
  if (typeof value !== "string") return value ?? null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

// Form fields (strings; `targets` is the list of checked boxes) -> posts row.
export const postFormSchema = z
  .object({
    title: z
      .string("El título es obligatorio.")
      .trim()
      .min(1, "El título es obligatorio.")
      .max(200, "El título admite como máximo 200 caracteres."),
    slug: z.preprocess(
      blankToNull,
      z
        .string()
        .max(80, "El enlace admite como máximo 80 caracteres.")
        .regex(SLUG_PATTERN, "Solo minúsculas, números y guiones (ej. charla-lambda).")
        .nullable(),
    ),
    body: z
      .string("Escribe el texto de la publicación.")
      .trim()
      .min(1, "Escribe el texto de la publicación.")
      .max(10000, "El texto admite como máximo 10000 caracteres."),
    targets: z
      .array(z.enum(POST_TARGETS, "Destino no válido."))
      .min(1, "Elige al menos un destino.")
      .transform((targets) => POST_TARGETS.filter((t) => targets.includes(t))),
    scheduled_at: z.preprocess(
      blankToNull,
      z.string().refine(isValidMadridLocal, "La fecha no es válida.").nullable(),
    ),
    event_id: z.preprocess(blankToNull, z.uuid("Elige un evento de la lista.").nullable()),
    image_path: z.preprocess(
      blankToNull,
      z.string().regex(IMAGE_PATH_PATTERN, "Imagen no válida.").nullable(),
    ),
  })
  .transform((post) => ({
    ...post,
    slug: post.slug ?? (slugify(post.title) || "publicacion"),
    scheduled_at: post.scheduled_at ? madridLocalToUtcIso(post.scheduled_at) : null,
  }));

export type PostRowInput = z.output<typeof postFormSchema>;

export const postStatusSchema = z.enum(POST_STATUSES);

// Client-side limit; matches the `public-media` bucket file_size_limit.
export const MAX_POST_IMAGE_BYTES = 5 * 1024 * 1024;
