// Pure helpers for post content: slugs, previews and per-network checks.

export function slugify(text: string) {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/, "");
}

// First `max` characters, cut at the last space, with an ellipsis.
export function previewText(text: string, max: number) {
  const clean = text.trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  const space = cut.lastIndexOf(" ");
  return `${(space > max * 0.5 ? cut.slice(0, space) : cut).trimEnd()}…`;
}

// Characters shown before "ver más" / "más" on each network.
export const LINKEDIN_FOLD = 210;
export const INSTAGRAM_FOLD = 125;
const LIMITS = { linkedin: 3000, instagram: 2200 } as const;

export function networkWarnings({
  body,
  hasImage,
  targets,
}: {
  body: string;
  hasImage: boolean;
  targets: readonly string[];
}) {
  const warnings: string[] = [];
  if (targets.includes("instagram")) {
    if (!hasImage) warnings.push("Instagram necesita una imagen.");
    if (body.length > LIMITS.instagram) {
      warnings.push(`El texto supera los ${LIMITS.instagram} caracteres de Instagram.`);
    }
  }
  if (targets.includes("linkedin") && body.length > LIMITS.linkedin) {
    warnings.push(`El texto supera los ${LIMITS.linkedin} caracteres de LinkedIn.`);
  }
  return warnings;
}
