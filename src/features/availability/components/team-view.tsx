"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { CalendarDays, Grid3x3, Laptop, Users } from "lucide-react";
import { dayAgenda, memberColor } from "@/features/calendar-entries/agenda";
import { TeamWeekCalendar } from "@/features/calendar-entries/components/team-week-calendar";
import { cn } from "@/lib/utils";
import { formatDay } from "../dates";
import {
  commonFreeRanges,
  formatOccupation,
  occupationColor,
  teamAvailability,
  teamOnlineAvailability,
} from "../occupation";
import { notesForCell } from "../notes";
import { SLOTS_PER_DAY, minutesToTime, slotStart } from "../slots";
import type { TeamWeek } from "../types";
import { NoteList } from "./note-list";

const SLOTS = Array.from({ length: SLOTS_PER_DAY }, (_, i) => i);

// Week map: each cell is how many of the selected members are free
// (n = everyone free, green … 0 = nobody free, red) and, next to a laptop
// icon, how many of those are only online. Cells covered by a
// selected member's note show a dot; the notes are listed below the legend,
// followed by each day's agenda: every selected person's calendar entries
// (title when they share it, otherwise "Ocupado") and Google busy time
// (always "Ocupado").
// The "Calendario" mode (?modo=calendario) swaps the map and that list for the
// same agenda drawn as a regular week calendar.
export function TeamView({ week, today }: { week: TeamWeek; today: string }) {
  const calendarMode = useSearchParams().get(MODE_PARAM) === CALENDAR_MODE;
  const [selected, setSelected] = useState(
    () => new Set(week.members.map((m) => m.email)),
  );
  const people = week.members
    .map((m) => m.email)
    .filter((email) => selected.has(email));
  const free = teamAvailability(week.occupation, people, week.dates);
  const freeOnline = teamOnlineAvailability(week.occupation, week.online, people, week.dates);
  const common = commonFreeRanges(week.occupation, people, week.dates);
  const total = people.length;
  const notes = week.notes.filter((note) => selected.has(note.member_email));
  const names = new Map(week.members.map((m) => [m.email, m.name]));
  const weekAgenda = week.dates.map((date) => ({
    date,
    items: dayAgenda({
      date,
      members: week.members,
      selected: people,
      entries: week.entries,
      google: week.google,
    }),
  }));
  const agenda = weekAgenda.filter((day) => day.items.length > 0);

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
      <ModeToggle calendar={calendarMode} />
      <fieldset className="flex flex-wrap gap-2">
        <legend className="mb-2 text-sm font-medium">Personas</legend>
        {week.members.map((member, index) => (
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
            <span
              aria-hidden
              className="size-2.5 rounded-full"
              style={{ backgroundColor: memberColor(member.color, index) }}
            />
            {member.name}
          </label>
        ))}
      </fieldset>

      {calendarMode ? (
        <section className="flex flex-col gap-2" aria-labelledby="team-calendar-heading">
          <h2 id="team-calendar-heading" className="sr-only">
            Calendario de la semana
          </h2>
          <TeamWeekCalendar days={weekAgenda} today={today} />
          <p className="text-xs text-muted-foreground">
            Cada bloque es algo que tiene una de las personas seleccionadas, en su color. Las
            entradas muestran su título si su autor lo comparte; el resto, y lo que viene de
            Google (más claro), aparece como «Ocupado». Las reuniones del grupo llevan un borde
            marcado y el icono{" "}
            <Users aria-label="(grupo)" className="inline size-3 align-[-2px]" />.
          </p>
        </section>
      ) : (
        <>
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
                      const available = free[date][slot];
                      const online = freeOnline[date][slot];
                      const cellNotes = notesForCell(notes, date, slot);
                      const noteText =
                        cellNotes.length > 0
                          ? ` · Notas: ${cellNotes
                              .map((n) => `${names.get(n.member_email) ?? n.member_email}: ${n.title}`)
                              .join(", ")}`
                          : "";
                      const label = `${formatDay(date)} ${time}: disponibles ${formatOccupation(available)} de ${total}${online > 0 ? `, ${formatOccupation(online)} solo online` : ""}${noteText}`;
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
                          style={{ backgroundColor: occupationColor(total - available, total) }}
                        >
                          {formatOccupation(available)}
                          {online > 0 && (
                            <span className="ml-1 inline-flex items-center gap-0.5 align-top">
                              <Laptop aria-hidden className="size-2.5" />
                              {formatOccupation(online)}
                            </span>
                          )}
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
        </>
      )}

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">Notas del equipo</h2>
        <NoteList
          notes={notes}
          authors={names}
          empty="Las personas seleccionadas no tienen notas esta semana."
        />
      </section>

      {!calendarMode && (
        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">Agenda de la semana</h2>
          <p className="text-sm text-muted-foreground">
            Lo que tienen las personas seleccionadas cada día. Las entradas muestran su título si
            su autor lo comparte; el resto, y lo que viene de Google, aparece como «Ocupado».
          </p>
          {agenda.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Las personas seleccionadas no tienen nada apuntado esta semana.
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {agenda.map((day) => (
                <div key={day.date} className="flex flex-col gap-1">
                  <h3 className="text-sm font-medium">{formatDay(day.date)}</h3>
                  <ul className="divide-y rounded-lg border">
                    {day.items.map((item) => (
                      <li
                        key={item.key}
                        className="flex flex-wrap items-center gap-x-2 gap-y-0.5 px-4 py-2 text-sm"
                      >
                        <span
                          aria-hidden
                          className="size-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="font-medium">{item.name}</span>
                        <span className="text-muted-foreground tabular-nums">
                          {item.start}–{item.end}
                        </span>
                        <span
                          className={cn(
                            "min-w-0 break-words",
                            item.kind === "google" && "text-muted-foreground",
                          )}
                        >
                          {item.label}
                          {item.kind === "google" && (
                            <span className="sr-only"> (calendario de Google)</span>
                          )}
                        </span>
                        {item.groupMeeting && (
                          <span className="inline-flex items-center gap-1 rounded-full border px-2 text-xs text-muted-foreground">
                            <Users aria-hidden className="size-3" />
                            Reunión del grupo
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

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

const MODE_PARAM = "modo";
const CALENDAR_MODE = "calendario";

// Two-button segmented control. The choice lives in ?modo= (set without a
// navigation), so it survives reloads and the week links keep it.
function ModeToggle({ calendar }: { calendar: boolean }) {
  function choose(next: boolean) {
    const params = new URLSearchParams(window.location.search);
    if (next) params.set(MODE_PARAM, CALENDAR_MODE);
    else params.delete(MODE_PARAM);
    window.history.replaceState(null, "", `${window.location.pathname}?${params}`);
  }
  const option = (active: boolean) =>
    cn(
      "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
      active
        ? "bg-background font-medium shadow-sm"
        : "text-muted-foreground hover:text-foreground",
    );
  return (
    <div
      role="group"
      aria-label="Tipo de vista"
      className="inline-flex w-fit gap-1 rounded-lg bg-muted p-1"
    >
      <button
        type="button"
        aria-pressed={!calendar}
        onClick={() => choose(false)}
        className={option(!calendar)}
      >
        <Grid3x3 aria-hidden className="size-4" />
        Disponibilidad
      </button>
      <button
        type="button"
        aria-pressed={calendar}
        onClick={() => choose(true)}
        className={option(calendar)}
      >
        <CalendarDays aria-hidden className="size-4" />
        Calendario
      </button>
    </div>
  );
}

function Legend({ total }: { total: number }) {
  const steps = [total, total / 2, 0];
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
        Cada franja cuenta cuántas de las personas seleccionadas están disponibles: 1 si está
        libre, 0,5 si tiene algo que podría mover, 0 si no puede. {formatOccupation(total)}{" "}
        (verde) = todos libres; 0 (rojo) = nadie libre. Junto al portátil{" "}
        <Laptop aria-label="(portátil)" className="inline size-3 align-[-2px]" />, cuántas de
        esas personas disponibles solo pueden online. Un punto en la franja indica que alguien
        dejó una nota.
      </p>
    </div>
  );
}
