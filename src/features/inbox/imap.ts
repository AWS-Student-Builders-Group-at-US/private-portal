import "server-only";
import { ImapFlow, type FetchMessageObject } from "imapflow";
import { simpleParser, type AddressObject } from "mailparser";
import { type Address, maskCommonAccount, normalizeSearch, pageOfUids } from "./logic";
import type { InboxMessage, InboxPage, InboxResult, InboxSummary, InboxView } from "./types";

// Read-only access to the INBOX of the group's common account (GMAIL_USER)
// over IMAP with the Gmail app password. Safety rules:
// - the mailbox is opened with EXAMINE (readOnly) and bodies are fetched with
//   BODY.PEEK (imapflow's default), so nothing is marked as read;
// - no command that moves, deletes, flags or sends is ever issued;
// - one short-lived connection per request, always logged out in `finally`;
// - credentials, addresses and message content are never logged or stored.

const TIMEOUT_MS = 10_000;

function getInboxCredentials() {
  const user = process.env.GMAIL_USER?.trim();
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) return null;
  return { user, pass };
}

async function withInbox<T>(
  run: (client: ImapFlow, account: string) => Promise<T>,
): Promise<InboxResult<T>> {
  const auth = getInboxCredentials();
  if (!auth) return { ok: false, error: "not_configured" };

  const client = new ImapFlow({
    host: "imap.gmail.com",
    port: 993,
    secure: true,
    auth,
    logger: false,
    disableAutoIdle: true,
    connectionTimeout: TIMEOUT_MS,
    greetingTimeout: TIMEOUT_MS,
    socketTimeout: 3 * TIMEOUT_MS,
  });
  // Without a listener, a socket error would be thrown as an unhandled event.
  client.on("error", () => {});

  try {
    await client.connect();
    const lock = await client.getMailboxLock("INBOX", { readOnly: true });
    try {
      return { ok: true, data: await run(client, auth.user) };
    } finally {
      lock.release();
    }
  } catch {
    // Never log the error: it may contain the account or message data.
    console.error("inbox: IMAP request failed");
    return { ok: false, error: "unavailable" };
  } finally {
    await client.logout().catch(() => client.close());
  }
}

const toIso = (value: Date | string | undefined) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

function toSummary(message: FetchMessageObject, account: string): InboxSummary {
  const [sender] = maskCommonAccount(
    message.envelope?.from?.slice(0, 1).map(({ name, address }) => ({ name, address })) ?? [],
    account,
  );
  return {
    uid: message.uid,
    from: sender?.name?.trim() || sender?.address || "Desconocido",
    fromAddress: sender?.address ?? null,
    subject: message.envelope?.subject?.trim() || "(Sin asunto)",
    date: toIso(message.envelope?.date ?? message.internalDate),
    unread: !message.flags?.has("\\Seen"),
  };
}

async function readPage(
  client: ImapFlow,
  account: string,
  { page, query }: { page: number; query: string | null },
): Promise<InboxPage> {
  const search = normalizeSearch(query ?? undefined);
  const found = await client.search(
    search ? { or: [{ subject: search }, { from: search }] } : { all: true },
    { uid: true },
  );
  const all = found || [];
  const { uids, hasOlder } = pageOfUids(all, page);
  if (uids.length === 0) return { messages: [], hasOlder: false, total: all.length };

  const fetched = await client.fetchAll(
    uids.join(","),
    { uid: true, envelope: true, flags: true, internalDate: true },
    { uid: true },
  );
  const messages = fetched.map((message) => toSummary(message, account)).sort((a, b) => b.uid - a.uid);
  return { messages, hasOlder, total: all.length };
}

const addresses = (value: AddressObject | AddressObject[] | undefined, account: string): Address[] =>
  maskCommonAccount(
    (Array.isArray(value) ? value : value ? [value] : []).flatMap((group) =>
      group.value.map(({ name, address }) => ({ name, address })),
    ),
    account,
  );

async function readMessage(client: ImapFlow, account: string, uid: number): Promise<InboxMessage | null> {
  // `source` is fetched as BODY.PEEK[]: the message stays unread.
  const message = await client.fetchOne(String(uid), { uid: true, source: true }, { uid: true });
  if (!message || !message.source) return null;

  // Inline (cid:) images become data: URIs, which the iframe CSP allows.
  const parsed = await simpleParser(message.source, { skipTextToHtml: true });
  return {
    uid: message.uid,
    subject: parsed.subject?.trim() || "(Sin asunto)",
    from: addresses(parsed.from, account),
    to: addresses(parsed.to, account),
    cc: addresses(parsed.cc, account),
    date: toIso(parsed.date),
    text: parsed.text?.trim() || null,
    html: typeof parsed.html === "string" && parsed.html.trim() ? parsed.html : null,
    attachments: parsed.attachments.map((attachment) => ({
      filename: attachment.filename || "(sin nombre)",
      size: attachment.size,
    })),
  };
}

// The list page and, when `uid` is given, that message, over a single
// connection (the two-pane layout needs both on /panel/correo/[uid]).
export async function getImapInboxView({
  page,
  query,
  uid,
}: {
  page: number;
  query: string | null;
  uid: number | null;
}): Promise<InboxResult<InboxView>> {
  return withInbox(async (client, account) => {
    const list = await readPage(client, account, { page, query });
    const message = uid === null ? null : await readMessage(client, account, uid);
    return { page: list, message };
  });
}
