import Form from "next/form";
import Link from "next/link";
import { ChevronLeft, ChevronRight, RotateCw, Search, X } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatRange, inboxHref } from "../logic";
import type { InboxPage } from "../types";

const iconButton = buttonVariants({ variant: "ghost", size: "icon-sm" });

function PageLink({
  href,
  label,
  children,
}: {
  href: string | null;
  label: string;
  children: React.ReactNode;
}) {
  if (!href) {
    return (
      <span aria-disabled="true" aria-label={label} className={cn(iconButton, "pointer-events-none opacity-35")}>
        {children}
      </span>
    );
  }
  return (
    <Link href={href} aria-label={label} title={label} className={iconButton}>
      {children}
    </Link>
  );
}

// Search, range and paging controls on top of the message list.
export function InboxToolbar({
  inbox,
  page,
  query,
  uid,
}: {
  inbox: InboxPage;
  page: number;
  query: string | null;
  uid: number | null;
}) {
  const range = formatRange(page, inbox.messages.length, inbox.total);
  return (
    <div className="sticky top-0 z-10 flex flex-col gap-2 border-b bg-card/95 p-3 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <Form action="/panel/correo" role="search" className="relative">
        <label htmlFor="inbox-search" className="sr-only">
          Buscar por asunto o remitente
        </label>
        <Search
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
        />
        <input
          id="inbox-search"
          name="q"
          type="search"
          maxLength={100}
          defaultValue={query ?? ""}
          placeholder="Buscar por asunto o remitente"
          className="h-9 w-full rounded-lg border border-input bg-background pr-9 pl-8 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 [&::-webkit-search-cancel-button]:hidden"
        />
        {query && (
          <Link
            href="/panel/correo"
            aria-label="Quitar búsqueda"
            title="Quitar búsqueda"
            className={cn(
              buttonVariants({ variant: "ghost", size: "icon-xs" }),
              "absolute top-1/2 right-1.5 -translate-y-1/2 text-muted-foreground",
            )}
          >
            <X />
          </Link>
        )}
      </Form>
      <div className="flex items-center justify-between gap-2">
        <p className="font-mono text-xs text-muted-foreground tabular-nums" aria-live="polite">
          {range || "0 correos"}
          {query && range && <span className="sr-only"> para «{query}»</span>}
        </p>
        <nav aria-label="Paginación" className="flex items-center gap-0.5">
          <Link
            href={inboxHref({ page, query, uid })}
            aria-label="Actualizar"
            title="Actualizar"
            className={iconButton}
          >
            <RotateCw />
          </Link>
          <PageLink href={page > 1 ? inboxHref({ page: page - 1, query }) : null} label="Más recientes">
            <ChevronLeft />
          </PageLink>
          <PageLink href={inbox.hasOlder ? inboxHref({ page: page + 1, query }) : null} label="Más antiguos">
            <ChevronRight />
          </PageLink>
        </nav>
      </div>
    </div>
  );
}
