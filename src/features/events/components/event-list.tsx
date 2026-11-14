import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { formatMadridDateTimeShort } from "../time";
import type { EventSummary } from "../types";

export function EventList({
  title,
  events,
  emptyText,
}: {
  title: string;
  events: EventSummary[];
  emptyText: string;
}) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold">{title}</h2>
      {events.length === 0 ? (
        <p className="text-sm text-muted-foreground">{emptyText}</p>
      ) : (
        <ul className="divide-y rounded-lg border">
          {events.map((event) => (
            <li key={event.id}>
              <Link
                href={`/panel/eventos/${event.id}`}
                className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-muted"
              >
                <div className="flex min-w-0 flex-col gap-0.5">
                  <span className="truncate font-medium">{event.title}</span>
                  <span className="text-sm text-muted-foreground">
                    {formatMadridDateTimeShort(event.starts_at)}
                    {event.location && ` · ${event.location}`}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {event.expected_attendees !== null &&
                      `${event.expected_attendees} asistentes previstos · `}
                    {event.file_count === 1
                      ? "1 archivo"
                      : `${event.file_count} archivos`}
                  </span>
                </div>
                <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// Upcoming: not finished yet (ascending). Past: finished (most recent first).
export function splitEvents(events: EventSummary[], now: Date) {
  const nowIso = now.toISOString();
  const upcoming: EventSummary[] = [];
  const past: EventSummary[] = [];
  for (const event of events) {
    const end = new Date(event.ends_at ?? event.starts_at).toISOString();
    (end >= nowIso ? upcoming : past).push(event);
  }
  past.reverse();
  return { upcoming, past };
}
