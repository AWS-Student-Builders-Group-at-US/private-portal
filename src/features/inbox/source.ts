import "server-only";
import { cacheLife } from "next/cache";
import { findFixtureMessage, listFixtureMessages } from "./fixture-source";
import { buildFixtureMessages } from "./fixtures";
import { getImapInboxView } from "./imap";
import { isFixtureMode } from "./logic";
import type { InboxResult, InboxView } from "./types";

export type InboxViewRequest = { page: number; query: string | null; uid: number | null };

// Entry point for /panel/correo: live IMAP, or the local sample emails when
// INBOX_FIXTURES=1 outside production (`isFixtureMode`). Same shapes either way.
//
// "use cache: private" for one minute so going back from a message to the
// list (or reopening the mailbox) is instant. Emails are still never stored:
// per the Next docs a private cache is not kept in any server cache across
// production requests; the result only lives in that member's browser memory
// (the client router cache, lost on reload) for the stale time. A stale time
// under five minutes also keeps the mailbox out of the prefetched App Shell,
// so IMAP only runs when a member opens it.
export async function loadInboxView(
  request: InboxViewRequest,
): Promise<{ result: InboxResult<InboxView>; fixtures: boolean }> {
  "use cache: private";
  cacheLife({ stale: 60, revalidate: 60, expire: 300 });
  if (!isFixtureMode(process.env)) {
    return { result: await getImapInboxView(request), fixtures: false };
  }

  const messages = buildFixtureMessages();
  return {
    fixtures: true,
    result: {
      ok: true,
      data: {
        page: listFixtureMessages(messages, request),
        message: request.uid === null ? null : findFixtureMessage(messages, request.uid),
      },
    },
  };
}
