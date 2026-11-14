// Pure helpers for the links page: search, category filter and grouping.

type FilterableLink = {
  title: string;
  url: string;
  category: string | null;
  notes: string | null;
};

// category: null = all, "" = links without a category.
export type LinkFilters = { q: string; category: string | null };

export const NO_CATEGORY_PARAM = "sin-categoria";

const normalize = (text: string) =>
  text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

export function parseLinkFilters(params: Record<string, string | string[] | undefined>): LinkFilters {
  const q = typeof params.q === "string" ? params.q.trim() : "";
  const raw = typeof params.categoria === "string" ? params.categoria.trim() : "";
  const category = raw === NO_CATEGORY_PARAM ? "" : raw || null;
  return { q, category };
}

export function filterLinks<T extends FilterableLink>(links: T[], filters: LinkFilters): T[] {
  const terms = normalize(filters.q).split(/\s+/).filter(Boolean);
  return links.filter((link) => {
    if (filters.category !== null && (link.category ?? "") !== filters.category) return false;
    if (terms.length === 0) return true;
    const haystack = normalize(
      [link.title, link.url, link.category ?? "", link.notes ?? ""].join(" "),
    );
    return terms.every((term) => haystack.includes(term));
  });
}

const collator = new Intl.Collator("es", { sensitivity: "base" });

export function linkCategories(links: FilterableLink[]): string[] {
  const set = new Set<string>();
  for (const link of links) if (link.category) set.add(link.category);
  return [...set].sort(collator.compare);
}

// [category, links][] sorted by category; links without one go last (null).
export function groupByCategory<T extends FilterableLink>(links: T[]): [string | null, T[]][] {
  const groups = new Map<string | null, T[]>();
  for (const link of links) {
    const key = link.category ?? null;
    groups.set(key, [...(groups.get(key) ?? []), link]);
  }
  return [...groups.entries()].sort(([a], [b]) =>
    a === null ? 1 : b === null ? -1 : collator.compare(a, b),
  );
}
