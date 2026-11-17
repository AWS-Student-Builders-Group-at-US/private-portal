import Link from "next/link";
import { ArrowLeft, Mail } from "lucide-react";
import { cn } from "@/lib/utils";
import { inboxHref } from "../logic";
import type { InboxResult, InboxView } from "../types";
import { FixtureNotice } from "./fixture-notice";
import { InboxList } from "./inbox-list";
import { EmptyReadingPane, InboxErrorState } from "./inbox-states";
import { InboxToolbar } from "./inbox-toolbar";
import { MessageView } from "./message-view";

// Frame shared by the client and its loading skeleton: list column (380px)
// and reading pane side by side on lg+, one at a time below that.
export const mailFrameClass =
  "overflow-clip rounded-2xl border bg-card shadow-xs lg:grid lg:h-[calc(100dvh-11rem)] lg:min-h-[32rem] lg:grid-cols-[380px_minmax(0,1fr)]";
export const listColumnClass = "flex min-h-0 flex-col lg:border-r";
export const readingColumnClass = "min-h-0 lg:overflow-y-auto lg:bg-muted/30";

export function MailHeader({
  fixtures,
  backHref,
}: {
  fixtures: boolean;
  // Set on /panel/correo/[uid]: mobile shows a back link instead of the title.
  backHref: string | null;
}) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-3">
      {backHref && (
        <Link
          href={backHref}
          className="inline-flex items-center gap-1.5 rounded-md text-sm font-medium text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring lg:hidden"
        >
          <ArrowLeft aria-hidden className="size-4" />
          Bandeja
        </Link>
      )}
      <div className={cn("flex items-center gap-3", backHref && "max-lg:sr-only")}>
        <span
          aria-hidden
          className="flex size-10 items-center justify-center rounded-xl bg-[var(--aws-squid)] text-[var(--aws-orange)] dark:ring-1 dark:ring-white/10"
        >
          <Mail className="size-5" />
        </span>
        <div className="flex flex-col">
          <h1 className="text-2xl leading-tight font-semibold">Correo AWS</h1>
          <p className="text-sm text-muted-foreground">Bandeja de la cuenta común · solo lectura</p>
        </div>
      </div>
      {fixtures && <FixtureNotice />}
    </header>
  );
}

export function MailClient({
  result,
  fixtures,
  page,
  query,
  uid,
  now,
}: {
  result: InboxResult<InboxView>;
  fixtures: boolean;
  page: number;
  query: string | null;
  uid: number | null;
  now: Date;
}) {
  const reading = uid !== null;
  return (
    <div className="flex flex-col gap-4">
      <MailHeader fixtures={fixtures} backHref={reading ? inboxHref({ page, query }) : null} />
      <div className={mailFrameClass}>
        {result.ok ? (
          <>
            <section aria-label="Bandeja de entrada" className={cn(listColumnClass, reading && "max-lg:hidden")}>
              <InboxToolbar inbox={result.data.page} page={page} query={query} uid={uid} />
              <div className="min-h-0 flex-1 lg:overflow-y-auto">
                <InboxList inbox={result.data.page} page={page} query={query} selectedUid={uid} now={now} />
              </div>
            </section>
            <section aria-label="Lectura" className={cn(readingColumnClass, !reading && "max-lg:hidden")}>
              {result.data.message ? (
                <MessageView message={result.data.message} />
              ) : (
                <EmptyReadingPane className="h-full" />
              )}
            </section>
          </>
        ) : (
          <div className="flex items-center justify-center lg:col-span-2">
            <InboxErrorState error={result.error} retryHref={inboxHref({ page, query, uid })} />
          </div>
        )}
      </div>
    </div>
  );
}
