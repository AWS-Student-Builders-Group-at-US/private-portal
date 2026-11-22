import "server-only";
import { cache } from "react";
import { cacheLife } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type Member = {
  email: string;
  name: string;
};

// Returns the signed-in Core Team member, or redirects:
// signed out -> /login, signed in but not in `members` -> /no-access.
// Deduplicated per request with React cache(), and "use cache: private" so
// the resolved member is cached per session in the browser only (never in a
// shared server cache): panel pages that read it can be part of the
// prefetched App Shell. redirect() throws, so only a resolved member is
// cached.
export const getCurrentMember = cache(async (): Promise<Member> => {
  "use cache: private";
  cacheLife("minutes");
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const email = claimsData?.claims?.email;
  if (!email) {
    redirect("/login");
  }

  // RLS only exposes `members` rows to members (is_member()), so a
  // non-member gets no row back.
  const { data: member } = await supabase
    .from("members")
    .select("email, name")
    .eq("email", email.toLowerCase())
    .maybeSingle();

  if (!member) {
    redirect("/no-access");
  }
  return member;
});
