import Link from "next/link";
import { formatMadridDateTimeShort } from "@/features/events/time";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import type { InboxPage } from "../imap";

function pageHref(page: number, query: string | null) {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  if (page > 1) params.set("pagina", String(page));
  const search = params.toString();
  return search ? `/panel/correo?${search}` : "/panel/correo";
}

export function InboxList({
  inbox,
  page,
  query,
}: {
  inbox: InboxPage;
  page: number;
  query: string | null;
}) {
  if (inbox.messages.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        {query ? "Ningún correo coincide con la búsqueda." : "No hay correos en esta página."}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <ul className="divide-y rounded-lg border">
        {inbox.messages.map((message) => (
          <li key={message.uid}>
            <Link
              href={`/panel/correo/${message.uid}`}
              className="flex flex-col gap-0.5 px-4 py-3 hover:bg-muted/50 sm:flex-row sm:items-baseline sm:gap-4"
            >
              <span
                className={cn(
                  "flex min-w-0 items-center gap-2 text-sm sm:w-56 sm:shrink-0",
                  message.unread && "font-semibold",
                )}
              >
                {message.unread && (
                  <span aria-hidden className="size-2 shrink-0 rounded-full bg-primary" />
                )}
                <span className="truncate">{message.from}</span>
                {message.unread && <span className="sr-only">(no leído)</span>}
              </span>
              <span className={cn("min-w-0 flex-1 truncate text-sm", message.unread && "font-semibold")}>
                {message.subject}
              </span>
              <span className="shrink-0 text-xs text-muted-foreground">
                {message.date ? formatMadridDateTimeShort(message.date) : ""}
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <nav aria-label="Paginación" className="flex flex-wrap gap-2">
        {page > 1 && (
          <Link href={pageHref(page - 1, query)} className={buttonVariants({ variant: "outline" })}>
            Más recientes
          </Link>
        )}
        {inbox.hasOlder && (
          <Link href={pageHref(page + 1, query)} className={buttonVariants({ variant: "outline" })}>
            Más antiguos
          </Link>
        )}
      </nav>
    </div>
  );
}
