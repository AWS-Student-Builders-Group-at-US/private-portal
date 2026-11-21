import type { Address } from "./logic";

// Shapes shared by the IMAP source, the local sample source and the UI.

export type InboxError = "not_configured" | "unavailable";
export type InboxResult<T> = { ok: true; data: T } | { ok: false; error: InboxError };

export type InboxSummary = {
  uid: number;
  from: string;
  fromAddress: string | null;
  subject: string;
  date: string | null;
  unread: boolean;
};

export type InboxPage = { messages: InboxSummary[]; hasOlder: boolean; total: number };

export type InboxMessage = {
  uid: number;
  subject: string;
  from: Address[];
  to: Address[];
  cc: Address[];
  date: string | null;
  text: string | null;
  html: string | null;
  attachments: { filename: string; size: number }[];
};

// What one request to /panel/correo needs: the list page and, on
// /panel/correo/[uid], the open message (null when it does not exist).
export type InboxView = { page: InboxPage; message: InboxMessage | null };
