"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { formatDay } from "../dates";
import {
  commonFreeRanges,
  formatOccupation,
  occupationColor,
  teamOccupation,
} from "../occupation";
import { notesForCell } from "../notes";
import { SLOTS_PER_DAY, minutesToTime, slotStart } from "../slots";
import type { TeamWeek } from "../types";
import { NoteList } from "./note-list";

const SLOTS = Array.from({ length: SLOTS_PER_DAY }, (_, i) => i);

// Week map: each cell is the sum of the selected members' occupation
// (0 = everyone free, green … n = everyone busy, red). Cells covered by a
// selected member's note show a dot; the notes are listed below the legend.
export function TeamView({ week }: { week: TeamWeek }) {
  const [selected, setSelected] = useState(
    () => new Set(week.members.map((m) => m.email)),
  );
  const people = week.members
    .map((m) => m.email)
    .filter((email) => selected.has(email));
  const sums = teamOccupation(week.occupation, people, week.dates);
  const common = commonFreeRanges(week.occupation, people, week.dates);
  const total = people.length;
  const notes = week.notes.filter((note) => selected.has(note.member_email));
  const names = new Map(week.members.map((m) => [m.email, m.name]));

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
          aria-label="Ocupación del equipo por franja"
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
                  const sum = sums[date][slot];
                  const cellNotes = notesForCell(notes, date, slot);
                  const noteText =
                    cellNotes.length > 0
                      ? ` · Notas: ${cellNotes
                          .map((n) => `${names.get(n.member_email) ?? n.member_email}: ${n.title}`)
                          .join(", ")}`
                      : "";
                  const label = `${formatDay(date)} ${time}: ocupación ${formatOccupation(sum)} de ${total}${noteText}`;
                  return (
                    <div
                      key={date}
                      role="cell"
                      title={label}
                      aria-label={label}
                      className={cn(
                        "relative h-5 rounded-[3px] text-center text-[0.6rem] leading-5 font-medium text-neutral-900 tabular-nums",
                        slot % 2 === 0 && "mt-px",
                      )}
                      style={{ backgroundColor: occupationColor(sum, total) }}
                    >
                      {formatOccupation(sum)}
                      {cellNotes.length > 0 && (
                        <span
                          aria-hidden
                          className="absolute top-0.5 right-0.5 size-1.5 rounded-full bg-neutral-900"
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
      <Legend total={total} />

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">Notas del equipo</h2>
        <NoteList
          notes={notes}
          authors={names}
          empty="Las personas seleccionadas no tienen notas esta semana."
        />
      </section>

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

function Legend({ total }: { total: number }) {
  const steps = [0, total / 2, total];
  return (
    <div className="flex flex-col gap-1 text-xs text-muted-foreground">
      <div
        className="h-3 w-full max-w-xs rounded-full"
        style={{
          background: `linear-gradient(to right, ${occupationColor(0, 1)}, ${occupationColor(0.5, 1)}, ${occupationColor(1, 1)})`,
        }}
        aria-hidden
      />
      <div className="flex w-full max-w-xs justify-between tabular-nums" aria-hidden>
        {steps.map((step, i) => (
          <span key={i}>{formatOccupation(step)}</span>
        ))}
      </div>
      <p>
        Cada franja suma la ocupación de las personas seleccionadas: 1 si no puede moverlo, 0,5
        si podría moverlo. 0 (verde) = todos libres; {formatOccupation(total)} (rojo) = todos
        ocupados. Un punto en la franja indica que alguien dejó una nota.
      </p>
    </div>
  );
}
