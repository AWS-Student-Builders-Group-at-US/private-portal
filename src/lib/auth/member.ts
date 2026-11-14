import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type Member = {
  email: string;
  name: string;
};

// Returns the signed-in Core Team member, or redirects:
// signed out -> /login, signed in but not in `members` -> /no-access.
// Deduplicated per request with React cache().
export const getCurrentMember = cache(async (): Promise<Member> => {
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
