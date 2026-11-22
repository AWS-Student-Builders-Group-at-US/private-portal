import { Users } from "lucide-react";
import { formatDay } from "@/features/availability/dates";
import { minutesToTime } from "@/features/availability/slots";
import { cn } from "@/lib/utils";
import type { AgendaItem } from "../agenda";
import { hourRange, layoutDay } from "../week-layout";

// Height of one hour row; blocks are positioned in percentages of the column.
const HOUR_REM = 3;

// The week agenda drawn as a regular week calendar: days as columns, hours as
// rows, each item a block spanning its time range in its person's colour, side
// by side when they overlap. Wider than a phone, so it scrolls horizontally
// inside its own box (the time column stays visible).
export function TeamWeekCalendar({
  days,
  today,
}: {
  days: { date: string; items: AgendaItem[] }[];
  today: string;
}) {
  const { from, to } = hourRange(days.flatMap((day) => day.items));
  const span = to - from;
  const hours = Array.from({ length: span / 60 }, (_, i) => from + i * 60);
  const height = `${(span / 60) * HOUR_REM}rem`;
  const percent = (minutes: number) => `${((minutes - from) / span) * 100}%`;

  return (
    <div className="overflow-x-auto rounded-lg border">
      <div className="grid min-w-[46rem] grid-cols-[3rem_repeat(7,minmax(0,1fr))]">
        <div className="sticky left-0 z-20 border-b bg-background" />
        {days.map(({ date }) => (
          <div
            key={date}
            aria-hidden
            className={cn(
              "border-b border-l px-1 py-2 text-center text-xs font-medium",
              date === today && "bg-muted",
            )}
          >
            {formatDay(date)}
          </div>
        ))}

        <div aria-hidden className="sticky left-0 z-20 bg-background" style={{ height }}>
          {hours.map((hour) => (
            <div
              key={hour}
              className="relative pr-1 text-right text-[0.65rem] text-muted-foreground"
              style={{ height: `${HOUR_REM}rem` }}
            >
              <span className="relative -top-2">{hour === from ? "" : minutesToTime(hour)}</span>
            </div>
          ))}
        </div>

        {days.map(({ date, items }) => (
          <section
            key={date}
            aria-label={formatDay(date)}
            className={cn("relative border-l", date === today && "bg-muted/40")}
            style={{ height }}
          >
            {hours.slice(1).map((hour) => (
              <div
                key={hour}
                aria-hidden
                className="absolute inset-x-0 border-t border-dashed border-border/70"
                style={{ top: percent(hour) }}
              />
            ))}
            {items.length === 0 ? (
              <p className="sr-only">Nada apuntado.</p>
            ) : (
              <ul>
                {layoutDay(items).map((block) => {
                  const google = block.kind === "google";
                  const text = `${block.name}, ${block.start}–${block.end}: ${block.label}${block.groupMeeting ? " (reunión del grupo)" : ""}${google ? " (calendario de Google)" : ""}`;
                  return (
                    <li
                      key={block.key}
                      title={text}
                      className={cn(
                        "absolute z-10 min-h-5 overflow-hidden rounded-md border-l-4 px-1 py-0.5 text-[0.65rem] leading-tight",
                        block.groupMeeting && "ring-2 ring-foreground/70 ring-inset",
                        google && "opacity-75",
                      )}
                      style={{
                        top: percent(Math.max(block.startMinutes, from)),
                        height: `calc(${percent(block.endMinutes)} - ${percent(block.startMinutes)} - 2px)`,
                        left: `calc(${(block.lane / block.lanes) * 100}% + 1px)`,
                        width: `calc(${100 / block.lanes}% - 2px)`,
                        borderLeftColor: block.color,
                        backgroundColor: `color-mix(in oklab, ${block.color} ${google ? 14 : 26}%, var(--background))`,
                      }}
                    >
                      <span className="sr-only">{text}</span>
                      <span aria-hidden className="flex flex-col">
                        <span
                          className={cn(
                            "flex items-center gap-0.5 font-medium break-words",
                            google && "text-muted-foreground",
                          )}
                        >
                          {block.groupMeeting && <Users className="size-3 shrink-0" />}
                          {block.label}
                        </span>
                        <span className="text-muted-foreground tabular-nums">
                          {block.start}–{block.end}
                        </span>
                        <span className="truncate text-muted-foreground">{block.name}</span>
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
