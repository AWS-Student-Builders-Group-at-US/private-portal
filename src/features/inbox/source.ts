import "server-only";
import { findFixtureMessage, listFixtureMessages } from "./fixture-source";
import { buildFixtureMessages } from "./fixtures";
import { getImapInboxView } from "./imap";
import { isFixtureMode } from "./logic";
import type { InboxResult, InboxView } from "./types";

export type InboxViewRequest = { page: number; query: string | null; uid: number | null };

// Entry point for /panel/correo: live IMAP, or the local sample emails when
// INBOX_FIXTURES=1 outside production (`isFixtureMode`). Same shapes either way.
export async function loadInboxView(
  request: InboxViewRequest,
): Promise<{ result: InboxResult<InboxView>; fixtures: boolean }> {
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
