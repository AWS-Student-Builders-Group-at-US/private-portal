import "server-only";
import { cacheLife } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { SuggestionStatus } from "./schema";
import type { Suggestion } from "./types";

// Panel list reads are "use cache: private": cached per session in the browser
// only (never in a shared server cache, so RLS results never cross members)
// for the "minutes" profile (5 min client stale time), which lets the panel
// prefetch and reopen pages instantly. The Server Actions that change this
// data call revalidatePath, which clears that client cache for the actor.

type Row = {
  id: string;
  body: string;
  status: SuggestionStatus;
  created_at: string;
  author: { name: string } | null;
  suggestion_votes: { member_email: string }[];
};

// All suggestions with vote counts; `me` marks the current member's votes.
export async function listSuggestions(me: string): Promise<Suggestion[]> {
  "use cache: private";
  cacheLife("minutes");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("suggestions")
    .select("id, body, status, created_at, author:members!suggestions_author_email_fkey(name), suggestion_votes(member_email)")
    .order("created_at", { ascending: false });
  if (error) throw new Error("No se pudieron cargar las sugerencias.");
  return (data as unknown as Row[]).map(({ author, suggestion_votes, ...row }) => ({
    ...row,
    author_name: author?.name ?? null,
    votes: suggestion_votes.length,
    voted_by_me: suggestion_votes.some((vote) => vote.member_email === me),
  }));
}
