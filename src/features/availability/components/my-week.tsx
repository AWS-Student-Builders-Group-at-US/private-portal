import { cn } from "@/lib/utils";
import { formatDay } from "../dates";
import { formatOccupation, occupationColor, type SlotOccupation } from "../occupation";
import { SLOTS_PER_DAY, minutesToTime, slotStart } from "../slots";
import type { MyWeek } from "../types";

const SLOTS = Array.from({ length: SLOTS_PER_DAY }, (_, i) => i);

const WEIGHT_TEXT: Record<number, string> = {
  1: "no lo puedo mover",
  0.5: "lo podría mover",
};

// Only times and calendar labels are shown; event titles are never stored.
function describe(slot: SlotOccupation, feedLabels: Map<string, string>) {
  const parts: string[] = [];
  const seen = new Set<string>();
  for (const hit of slot.google) {
    const label = (hit.source && feedLabels.get(hit.source)) ?? "Calendario";
    const text = `Google · ${label} (${WEIGHT_TEXT[hit.weight] ?? WEIGHT_TEXT[1]})`;
    if (!seen.has(text)) parts.push(text);
    seen.add(text);
  }
  if (slot.manual > 0) parts.push("Ocupado (semana habitual o cambio por fecha)");
  if (parts.length === 0) parts.push("Libre");
  return parts.join(" · ");
}

// The member's own week: 0 = free, 0,5 = could move it, 1 = can't move it.
// Cells whose value comes from Google show a "G".
export function MyWeekGrid({
  week,
  feeds,
}: {
  week: MyWeek;
  feeds: { id: string; label: string }[];
}) {
  const feedLabels = new Map(feeds.map((feed) => [feed.id, feed.label]));
  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-x-auto">
        <div
          className="grid min-w-[36rem] grid-cols-[3rem_repeat(7,minmax(0,1fr))] gap-px"
          role="table"
          aria-label="Tu ocupación por franja"
        >
          <div role="columnheader" />
          {week.dates.map((date) => (
            <div key={date} role="columnheader" className="pb-1 text-center text-xs font-medium">
              {formatDay(date)}
            </div>
          ))}
          {SLOTS.map((index) => {
            const time = minutesToTime(slotStart(index));
            return (
              <div key={index} className="contents" role="row">
                <div className="pr-1 text-right text-[0.65rem] leading-5 text-muted-foreground">
                  {index % 2 === 0 ? time : ""}
                </div>
                {week.dates.map((date) => {
                  const slot = week.days[date][index];
                  const fromGoogle =
                    slot.google.length > 0 &&
                    Math.max(...slot.google.map((hit) => hit.weight)) >= slot.manual;
                  const label = `${formatDay(date)} ${time}: ${formatOccupation(slot.value)} · ${describe(slot, feedLabels)}`;
                  return (
                    <div
                      key={date}
                      role="cell"
                      title={label}
                      aria-label={label}
                      className={cn(
                        "h-5 rounded-[3px] text-center text-[0.6rem] leading-5 font-semibold text-neutral-900",
                        slot.value === 0 && "opacity-35",
                        fromGoogle && "ring-1 ring-inset ring-neutral-900/50",
                        index % 2 === 0 && "mt-px",
                      )}
                      style={{ backgroundColor: occupationColor(slot.value, 1) }}
                    >
                      {fromGoogle ? "G" : ""}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {[
          { value: 0, text: "0 · Libre" },
          { value: 0.5, text: "0,5 · Lo podría mover" },
          { value: 1, text: "1 · No lo puedo mover" },
        ].map((item) => (
          <li key={item.value} className="flex items-center gap-1.5">
            <span
              aria-hidden
              className={cn("size-3 rounded-[3px]", item.value === 0 && "opacity-35")}
              style={{ backgroundColor: occupationColor(item.value, 1) }}
            />
            {item.text}
          </li>
        ))}
        <li className="flex items-center gap-1.5">
          <span
            aria-hidden
            className="flex size-3 items-center justify-center rounded-[3px] text-[0.5rem] font-semibold ring-1 ring-inset ring-current"
          >
            G
          </span>
          Viene de tus calendarios de Google
        </li>
      </ul>
    </div>
  );
}
