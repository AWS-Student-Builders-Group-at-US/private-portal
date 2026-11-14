"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { formatDay } from "../dates";
import {
  SLOTS_PER_DAY,
  commonFreeRanges,
  minutesToTime,
  slotStart,
  teamCounts,
} from "../slots";
import type { TeamWeek } from "../types";

const SLOTS = Array.from({ length: SLOTS_PER_DAY }, (_, i) => i);

// Week heatmap: the darker a slot, the more selected people are free.
export function TeamView({ week }: { week: TeamWeek }) {
  const [selected, setSelected] = useState(
    () => new Set(week.members.map((m) => m.email)),
  );
  const people = week.members
    .map((m) => m.email)
    .filter((email) => selected.has(email));
  const counts = teamCounts(week.free, people, week.dates);
  const common = commonFreeRanges(week.free, people, week.dates);
  const total = people.length;

  function toggle(email: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(email)) next.delete(email);
      else next.add(email);
      return next;
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <fieldset className="flex flex-wrap gap-2">
        <legend className="mb-2 text-sm font-medium">Personas</legend>
        {week.members.map((member) => (
          <label
            key={member.email}
            className={cn(
              "flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1 text-sm",
              selected.has(member.email) ? "bg-muted" : "text-muted-foreground",
            )}
          >
            <input
              type="checkbox"
              checked={selected.has(member.email)}
              onChange={() => toggle(member.email)}
              className="size-3.5"
            />
            {member.name}
          </label>
        ))}
      </fieldset>

      <div className="overflow-x-auto">
        <div
          className="grid min-w-[36rem] grid-cols-[3rem_repeat(7,minmax(0,1fr))] gap-px"
          role="table"
          aria-label="Personas libres por franja"
        >
          <div role="columnheader" />
          {week.dates.map((date) => (
            <div key={date} role="columnheader" className="pb-1 text-center text-xs font-medium">
              {formatDay(date)}
            </div>
          ))}
          {SLOTS.map((slot) => {
            const time = minutesToTime(slotStart(slot));
            return (
              <div key={slot} className="contents" role="row">
                <div className="pr-1 text-right text-[0.65rem] leading-5 text-muted-foreground">
                  {slot % 2 === 0 ? time : ""}
                </div>
                {week.dates.map((date) => {
                  const count = counts[date][slot];
                  const all = total > 0 && count === total;
                  const pct = total > 0 ? Math.round((count / total) * 85) : 0;
                  return (
                    <div
                      key={date}
                      role="cell"
                      title={`${formatDay(date)} ${time}: ${count} de ${total} libres`}
                      aria-label={`${formatDay(date)} ${time}: ${count} de ${total} libres`}
                      className={cn(
                        "h-5 rounded-[3px] bg-muted",
                        all && "ring-2 ring-inset ring-foreground/60",
                        slot % 2 === 0 && "mt-px",
                      )}
                      style={
                        count > 0
                          ? {
                              backgroundColor: `color-mix(in oklch, var(--primary) ${pct + 15}%, var(--muted))`,
                            }
                          : undefined
                      }
                    />
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Más oscuro = más personas libres. Con borde: están todas las seleccionadas.
      </p>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">Huecos en los que estáis todos</h2>
        {total === 0 ? (
          <p className="text-sm text-muted-foreground">Selecciona al menos una persona.</p>
        ) : common.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Esta semana no hay ninguna franja en la que estéis todos libres.
          </p>
        ) : (
          <ul className="divide-y rounded-lg border">
            {common.map((range) => (
              <li key={`${range.date}-${range.start}`} className="px-4 py-2 text-sm">
                <span className="font-medium">{formatDay(range.date)}</span> ·{" "}
                {range.start}–{range.end}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
