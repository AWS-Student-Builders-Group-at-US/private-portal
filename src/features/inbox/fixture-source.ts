import type { FixtureMessage } from "./fixtures";
import { matchesSearch, normalizeSearch, pageOfUids } from "./logic";
import type { InboxMessage, InboxPage, InboxSummary } from "./types";

// The local sample inbox, served through the same pure helpers as the IMAP
// path (search normalization, newest-first paging) so the UI is identical.

function toSummary(message: FixtureMessage): InboxSummary {
  const sender = message.from[0];
  return {
    uid: message.uid,
    from: sender?.name?.trim() || sender?.address || "Desconocido",
    fromAddress: sender?.address ?? null,
    subject: message.subject,
    date: message.date,
    unread: message.unread,
  };
}

export function listFixtureMessages(
  messages: FixtureMessage[],
  { page, query }: { page: number; query: string | null },
): InboxPage {
  const search = normalizeSearch(query ?? undefined);
  const found = search ? messages.filter((message) => matchesSearch(message, search)) : messages;
  const { uids, hasOlder } = pageOfUids(
    found.map((message) => message.uid),
    page,
  );
  const byUid = new Map(found.map((message) => [message.uid, message]));
  return {
    messages: uids.map((uid) => toSummary(byUid.get(uid)!)),
    hasOlder,
    total: found.length,
  };
}

export function findFixtureMessage(messages: FixtureMessage[], uid: number): InboxMessage | null {
  const found = messages.find((message) => message.uid === uid);
  if (!found) return null;
  return {
    uid: found.uid,
    subject: found.subject,
    from: found.from,
    to: found.to,
    cc: found.cc,
    date: found.date,
    text: found.text,
    html: found.html,
    attachments: found.attachments,
  };
}
