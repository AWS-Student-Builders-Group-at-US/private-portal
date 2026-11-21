import Link from "next/link";
import { MemberAvatar } from "@/components/member-avatar";
import { createClient } from "@/lib/supabase/server";
import { TEAM } from "../config";
import { findTeamMember } from "../team-match";

// Request-time: reads the session cookies, so it must render inside its own
// <Suspense fallback={null}> to keep the rest of the public page prerendered.
// Renders nothing for visitors without a session or who are not members.
// Only the display name and the public team photo reach the browser.
export async function SignedInMember() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  const email = claims?.email;
  if (!email) return null;

  // RLS only returns `members` rows to members, so a non-member gets null.
  const { data: member } = await supabase
    .from("members")
    .select("name")
    .eq("email", email.toLowerCase())
    .maybeSingle();
  if (!member) return null;

  const meta = (claims.user_metadata ?? {}) as Record<string, unknown>;
  const text = (value: unknown) => (typeof value === "string" ? value : null);
  const card = findTeamMember(
    [member.name, text(meta.given_name), text(meta.full_name), text(meta.name)],
    TEAM,
  );
  const name = card?.name ?? member.name;

  return (
    <Link
      href="/panel"
      title="Ir al panel"
      aria-label={`Ir al panel (${name})`}
      className="shrink-0 ring-offset-2 transition-shadow hover:ring-2 hover:ring-[var(--aws-orange)]"
    >
      <MemberAvatar name={name} photo={card?.photo} />
    </Link>
  );
}
