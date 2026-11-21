import { MailClient } from "@/features/inbox/components/mail-client";
import { normalizeSearch, parsePage } from "@/features/inbox/logic";
import { loadInboxView } from "@/features/inbox/source";
import { getCurrentMember } from "@/lib/auth/member";

// Read-only inbox of the group's common account, visible to every member.
// Emails are read live over IMAP and never stored.
export default async function InboxPage({ searchParams }: PageProps<"/panel/correo">) {
  const [params] = await Promise.all([searchParams, getCurrentMember()]);
  const page = parsePage(params.pagina);
  const query = normalizeSearch(params.q);
  const { result, fixtures } = await loadInboxView({ page, query, uid: null });

  return (
    <MailClient result={result} fixtures={fixtures} page={page} query={query} uid={null} now={new Date()} />
  );
}
