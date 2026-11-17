import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { InboxErrorNotice } from "@/features/inbox/components/inbox-error";
import { MessageView } from "@/features/inbox/components/message-view";
import { FixtureNotice } from "@/features/inbox/components/fixture-notice";
import { loadInboxView } from "@/features/inbox/source";
import { parseUid } from "@/features/inbox/logic";
import { getCurrentMember } from "@/lib/auth/member";

export default async function InboxMessagePage({ params }: PageProps<"/panel/correo/[uid]">) {
  const [{ uid: rawUid }] = await Promise.all([params, getCurrentMember()]);
  const uid = parseUid(rawUid);
  if (uid === null) notFound();

  const { result, fixtures } = await loadInboxView({ page: 1, query: null, uid });
  if (result.ok && !result.data.message) notFound();

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/panel/correo"
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Correo AWS
      </Link>
      {fixtures && <FixtureNotice />}
      {result.ok && result.data.message ? (
        <MessageView message={result.data.message} />
      ) : (
        !result.ok && <InboxErrorNotice error={result.error} />
      )}
    </div>
  );
}
