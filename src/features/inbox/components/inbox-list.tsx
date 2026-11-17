import Link from "next/link";
import { cn } from "@/lib/utils";
import { formatInboxDate, inboxHref, isAwsSender } from "../logic";
import type { InboxPage } from "../types";
import { EmptyInbox, NoResults } from "./inbox-states";
import { AwsBadge, SenderAvatar } from "./sender-avatar";

export function InboxList({
  inbox,
  page,
  query,
  selectedUid,
  now,
}: {
  inbox: InboxPage;
  page: number;
  query: string | null;
  selectedUid: number | null;
  now: Date;
}) {
  if (inbox.messages.length === 0) {
    return query ? <NoResults query={query} /> : <EmptyInbox />;
  }

  return (
    <nav aria-label="Correos">
      <ul className="divide-y divide-border/70">
        {inbox.messages.map((message) => {
          const selected = message.uid === selectedUid;
          const date = formatInboxDate(message.date, now);
          return (
            <li key={message.uid}>
              <Link
                href={inboxHref({ page, query, uid: message.uid })}
                aria-current={selected ? "page" : undefined}
                className={cn(
                  "relative flex gap-3 px-4 py-3 outline-none transition-colors",
                  "hover:bg-muted/70 focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
                  "before:absolute before:inset-y-2 before:left-0 before:w-[3px] before:rounded-r-full",
                  selected && "bg-accent before:bg-[var(--aws-orange)] hover:bg-accent",
                )}
              >
                <SenderAvatar name={message.from} address={message.fromAddress} />
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="flex items-center gap-2">
                    <span
                      className={cn(
                        "truncate text-sm",
                        message.unread ? "font-semibold text-foreground" : "text-foreground/85",
                      )}
                    >
                      {message.from}
                    </span>
                    {isAwsSender(message.fromAddress) && <AwsBadge />}
                    {date && (
                      <time
                        dateTime={message.date ?? undefined}
                        className={cn(
                          "ml-auto shrink-0 font-mono text-xs tabular-nums",
                          message.unread ? "font-semibold text-foreground" : "text-muted-foreground",
                        )}
                      >
                        {date}
                      </time>
                    )}
                  </span>
                  <span className="flex items-center gap-2">
                    <span
                      className={cn(
                        "truncate text-sm",
                        message.unread ? "font-medium text-foreground" : "text-muted-foreground",
                      )}
                    >
                      {message.subject}
                    </span>
                    {message.unread && (
                      <>
                        <span
                          aria-hidden
                          className="ml-auto size-2 shrink-0 rounded-full bg-[var(--aws-orange)]"
                        />
                        <span className="sr-only">(no leído)</span>
                      </>
                    )}
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
