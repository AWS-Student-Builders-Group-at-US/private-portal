import { SUGGESTION_STATUSES, type SuggestionStatus } from "./schema";

export type StatusFilter = SuggestionStatus | "todas";

export function parseStatusFilter(value: string | string[] | undefined): StatusFilter {
  if (value === "todas") return "todas";
  return SUGGESTION_STATUSES.find((status) => status === value) ?? "nueva";
}

// Most voted first; ties: newest first.
export function sortSuggestions<T extends { votes: number; created_at: string }>(list: T[]): T[] {
  return [...list].sort(
    (a, b) => b.votes - a.votes || (a.created_at < b.created_at ? 1 : a.created_at > b.created_at ? -1 : 0),
  );
}
