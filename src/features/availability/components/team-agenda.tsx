import { Users } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { ShowMore } from "@/components/show-more";
import { BUSY_LABEL, type AgendaItem } from "@/features/calendar-entries/agenda";
import { groupBy } from "@/lib/group";
import { cn } from "@/lib/utils";
import { formatDay } from "../dates";

// Items shown per day card before "Ver más".
const ITEMS_PER_DAY = 4;

// "Agenda de la semana" as one card per day with something on it: who and
// when first, the shared title under it only when there is one (busy-only
// entries and Google time just say who is busy and when).
export function WeekAgenda({
  days,
  today,
}: {
  days: { date: string; items: AgendaItem[] }[];
  today: string;
}) {
  if (days.length === 0) {
    return (
      <EmptyState>Las personas seleccionadas no tienen nada apuntado esta semana.</EmptyState>
    );
  }
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {days.map((day) => {
        const isToday = day.date === today;
        return (
          <article
            key={day.date}
            aria-label={formatDay(day.date)}
            className={cn(
              "flex min-w-0 flex-col rounded-lg border bg-card",
              isToday && "border-[var(--aws-orange)]",
            )}
          >
            <header className="flex items-center justify-between gap-2 border-b px-3 py-2">
              <h3 className="text-sm font-semibold first-letter:uppercase">
                {formatDay(day.date)}
              </h3>
              {isToday && (
                <span className="rounded-full bg-accent px-2 text-xs font-medium text-accent-foreground">
                  Hoy
                </span>
              )}
            </header>
            <ShowMore
              limit={ITEMS_PER_DAY}
              className="divide-y"
              toggleClassName="mx-2 mb-2"
            >
              {day.items.map((item) => (
                <li key={item.key} className="flex items-start gap-2 px-3 py-2 text-sm">
                  <span
                    aria-hidden
                    className="mt-1.5 size-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <div className="flex min-w-0 flex-1 flex-col">
                    <p className="flex flex-wrap items-baseline gap-x-2">
                      <span className="font-medium">{item.name}</span>
                      <span className="text-muted-foreground tabular-nums">
                        {item.start}–{item.end}
                      </span>
                    </p>
                    {item.label === BUSY_LABEL ? (
                      <span className="sr-only">
                        {BUSY_LABEL}
                        {item.kind === "google" && " (calendario de Google)"}
                      </span>
                    ) : (
                      <p className="break-words text-muted-foreground">{item.label}</p>
                    )}
                    {item.groupMeeting && (
                      <span className="mt-0.5 inline-flex w-fit items-center gap-1 rounded-full border px-2 text-xs text-muted-foreground">
                        <Users aria-hidden className="size-3" />
                        Reunión del grupo
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ShowMore>
          </article>
        );
      })}
    </div>
  );
}

// "Huecos en los que estáis todos": one row per day with its free ranges as
// chips, instead of one row per range.
export function CommonFreeSlots({
  ranges,
}: {
  ranges: { date: string; start: string; end: string }[];
}) {
  const days = groupBy(ranges, (range) => range.date);
  return (
    <ul className="divide-y rounded-lg border">
      {days.map((day) => (
        <li
          key={day.key}
          className="flex flex-col gap-1.5 px-4 py-2.5 sm:flex-row sm:items-center sm:gap-4"
        >
          <span className="text-sm font-medium first-letter:uppercase sm:w-28 sm:shrink-0">
            {formatDay(day.key)}
          </span>
          <ul className="flex flex-wrap gap-1.5" aria-label={`Huecos libres, ${formatDay(day.key)}`}>
            {day.items.map((range) => (
              <li
                key={range.start}
                className="rounded-full border border-emerald-600/30 bg-emerald-500/10 px-2.5 py-0.5 text-xs tabular-nums"
              >
                {range.start}–{range.end}
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ul>
  );
}
