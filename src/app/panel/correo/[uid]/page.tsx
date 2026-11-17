import { notFound } from "next/navigation";
import { MailClient } from "@/features/inbox/components/mail-client";
import { normalizeSearch, parsePage, parseUid } from "@/features/inbox/logic";
import { loadInboxView } from "@/features/inbox/source";
import { getCurrentMember } from "@/lib/auth/member";

// Two-pane view: the list (same search and page as the inbox) and the open
// message, both read over one IMAP connection.
export default async function InboxMessagePage({ params, searchParams }: PageProps<"/panel/correo/[uid]">) {
  const [{ uid: rawUid }, search] = await Promise.all([params, searchParams, getCurrentMember()]);
  const uid = parseUid(rawUid);
  if (uid === null) notFound();
  const page = parsePage(search.pagina);
  const query = normalizeSearch(search.q);

  const { result, fixtures } = await loadInboxView({ page, query, uid });
  if (result.ok && !result.data.message) notFound();

  return <MailClient result={result} fixtures={fixtures} page={page} query={query} uid={uid} now={new Date()} />;
}
