"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Pencil, StickyNote, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { createNote } from "../actions";
import { ManualEditForm } from "./manual-edit-form";
import { formatDay } from "../dates";
import {
  noteCoversCell,
  notesForCell,
  rectFromCorners,
  type CellRef,
  type NoteRect,
} from "../notes";
import { formatOccupation, occupationColor, type SlotOccupation } from "../occupation";
import { SLOTS_PER_DAY, minutesToTime, slotStart } from "../slots";
import type { MyWeek } from "../types";
import { NoteForm } from "./note-form";
import { NoteList } from "./note-list";

const SLOTS = Array.from({ length: SLOTS_PER_DAY }, (_, i) => i);

const WEIGHT_TEXT: Record<number, string> = {
  1: "no lo puedo mover",
  0.5: "lo podría mover",
};

const MANUAL_TEXT: Record<number, string> = { 0: "libre", ...WEIGHT_TEXT };

type Mode = "note" | "edit";

// Only times and calendar labels are shown; event titles are never stored.
function describe(slot: SlotOccupation, feedLabels: Map<string, string>) {
  if (slot.manual !== undefined) {
    return `Editado a mano (${MANUAL_TEXT[slot.manual] ?? MANUAL_TEXT[1]})`;
  }
  const parts: string[] = [];
  const seen = new Set<string>();
  for (const hit of slot.google) {
    const label = (hit.source && feedLabels.get(hit.source)) ?? "Calendario";
    const text = `Google · ${label} (${WEIGHT_TEXT[hit.weight] ?? WEIGHT_TEXT[1]})`;
    if (!seen.has(text)) parts.push(text);
    seen.add(text);
  }
  if (parts.length === 0) parts.push("Libre");
  return parts.join(" · ");
}

const sameCell = (a: CellRef | null, b: CellRef | null) =>
  !!a && !!b && a.date === b.date && a.slot === b.slot;

// The member's own week, from their Google calendars and their hand edits,
// shown as availability (1 - occupation): 1 = free, 0,5 = could move it,
// 0 = can't move it, like the team map. Cells with a Google block
// show a "G", hand-edited cells an "M"; cells covered by a note show a dot.
//
// "Añadir nota" and "Editar disponibilidad" modes: two corners define a
// rectangle of cells. Mouse: click two cells or drag from one to the other.
// Touch: tap two cells. Keyboard: arrow keys move, Enter/Space picks each
// corner, Escape cancels. Then a note form or the edit choices appear.
export function MyWeekGrid({
  week,
  feeds,
}: {
  week: MyWeek;
  feeds: { id: string; label: string }[];
}) {
  const feedLabels = new Map(feeds.map((feed) => [feed.id, feed.label]));
  const [mode, setMode] = useState<Mode | null>(null);
  const selecting = mode !== null;
  const [anchor, setAnchor] = useState<CellRef | null>(null);
  const [hover, setHover] = useState<CellRef | null>(null);
  const [selection, setSelection] = useState<NoteRect | null>(null);
  const [focus, setFocus] = useState({ day: 0, slot: 0 });
  const gridRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const pointerType = useRef("mouse");

  const preview: NoteRect | null =
    selection ?? (anchor ? rectFromCorners(anchor, hover ?? anchor) : null);

  const reset = useCallback(() => {
    setMode(null);
    setAnchor(null);
    setHover(null);
    setSelection(null);
    dragging.current = false;
  }, []);

  // A drag released outside the grid keeps the first corner.
  useEffect(() => {
    const stop = () => (dragging.current = false);
    window.addEventListener("pointerup", stop);
    return () => window.removeEventListener("pointerup", stop);
  }, []);

  function finish(from: CellRef, to: CellRef) {
    setSelection(rectFromCorners(from, to));
    setAnchor(null);
    setHover(null);
    dragging.current = false;
  }

  function pick(cell: CellRef) {
    if (selection) return;
    if (anchor) finish(anchor, cell);
    else {
      setAnchor(cell);
      setHover(cell);
    }
  }

  function moveFocus(day: number, slot: number) {
    const next = {
      day: Math.min(Math.max(day, 0), week.dates.length - 1),
      slot: Math.min(Math.max(slot, 0), SLOTS_PER_DAY - 1),
    };
    setFocus(next);
    if (anchor) setHover({ date: week.dates[next.day], slot: next.slot });
    gridRef.current
      ?.querySelector<HTMLElement>(`[data-cell="${next.day}:${next.slot}"]`)
      ?.focus();
  }

  function onKeyDown(event: React.KeyboardEvent, day: number, slot: number) {
    const moves: Record<string, [number, number]> = {
      ArrowLeft: [day - 1, slot],
      ArrowRight: [day + 1, slot],
      ArrowUp: [day, slot - 1],
      ArrowDown: [day, slot + 1],
      Home: [day, 0],
      End: [day, SLOTS_PER_DAY - 1],
    };
    if (moves[event.key]) {
      event.preventDefault();
      moveFocus(...moves[event.key]);
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      pick({ date: week.dates[day], slot });
    } else if (event.key === "Escape" && anchor) {
      event.preventDefault();
      setAnchor(null);
      setHover(null);
    }
  }

  function onPointerDown(event: React.PointerEvent, cell: CellRef) {
    pointerType.current = event.pointerType;
    if (selection || event.pointerType !== "mouse" || event.button !== 0) return;
    event.preventDefault();
    if (anchor) {
      finish(anchor, cell);
      return;
    }
    setAnchor(cell);
    setHover(cell);
    dragging.current = true;
  }

  function onPointerUp(event: React.PointerEvent, cell: CellRef) {
    if (event.pointerType !== "mouse" || !dragging.current) return;
    dragging.current = false;
    // A plain click keeps the first corner and waits for the second one.
    if (anchor && !sameCell(anchor, cell)) finish(anchor, cell);
  }

  // Touch and pen taps; mouse presses are handled by the pointer events.
  function onClick(cell: CellRef) {
    if (pointerType.current === "mouse") return;
    pick(cell);
  }

  const status = selection
    ? "Escribe la nota para la franja seleccionada."
    : anchor
      ? "Ahora elige la esquina opuesta del rectángulo (o pulsa Escape para empezar de nuevo)."
      : "Elige la primera esquina: haz clic o toca una franja, o arrastra sobre varias.";

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        {selecting ? (
          <Button variant="outline" size="sm" onClick={reset}>
            <X data-icon="inline-start" />
            {mode === "edit" ? "Cancelar edición" : "Cancelar nota"}
          </Button>
        ) : (
          <>
            <Button variant="outline" size="sm" onClick={() => setMode("edit")}>
              <Pencil data-icon="inline-start" />
              Editar disponibilidad
            </Button>
            <Button variant="outline" size="sm" onClick={() => setMode("note")}>
              <StickyNote data-icon="inline-start" />
              Añadir nota
            </Button>
          </>
        )}
        {selection && mode === "edit" ? (
          <ManualEditForm key={JSON.stringify(selection)} rect={selection} onDone={reset} />
        ) : (
          selecting && (
            <p className="text-sm text-muted-foreground" role="status">
              {status}
            </p>
          )
        )}
      </div>
      <div className="overflow-x-auto">
        <div
          ref={gridRef}
          className={cn(
            "grid min-w-[36rem] grid-cols-[3rem_repeat(7,minmax(0,1fr))] gap-px",
            selecting && !selection && "cursor-crosshair select-none",
          )}
          role={selecting ? "grid" : "table"}
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
                {week.dates.map((date, day) => {
                  const slot = week.days[date][index];
                  const cell = { date, slot: index };
                  const edited = slot.manual !== undefined;
                  const fromGoogle = !edited && slot.google.length > 0;
                  const notes = notesForCell(week.notes, date, index);
                  const selected = !!preview && noteCoversCell(preview, date, index);
                  const noteText =
                    notes.length > 0 ? ` · Notas: ${notes.map((n) => n.title).join(", ")}` : "";
                  const label = `${formatDay(date)} ${time}: disponibilidad ${formatOccupation(1 - slot.value)} · ${describe(slot, feedLabels)}${noteText}`;
                  const focusable = focus.day === day && focus.slot === index;
                  return (
                    <div
                      key={date}
                      role={selecting ? "gridcell" : "cell"}
                      title={label}
                      aria-label={label}
                      aria-selected={selecting ? selected : undefined}
                      data-cell={`${day}:${index}`}
                      tabIndex={selecting && !selection ? (focusable ? 0 : -1) : undefined}
                      onKeyDown={
                        selecting && !selection ? (e) => onKeyDown(e, day, index) : undefined
                      }
                      onFocus={selecting ? () => setFocus({ day, slot: index }) : undefined}
                      onPointerDown={selecting ? (e) => onPointerDown(e, cell) : undefined}
                      onPointerEnter={
                        selecting && anchor && !selection ? () => setHover(cell) : undefined
                      }
                      onPointerUp={selecting ? (e) => onPointerUp(e, cell) : undefined}
                      onClick={selecting ? () => onClick(cell) : undefined}
                      className={cn(
                        "relative h-5 rounded-[3px] text-center text-[0.6rem] leading-5 font-semibold text-neutral-900",
                        slot.value === 0 && !selected && "opacity-35",
                        (fromGoogle || edited) && "ring-1 ring-inset ring-neutral-900/50",
                        selected && "ring-2 ring-inset ring-neutral-900",
                        selecting &&
                          "outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        index % 2 === 0 && "mt-px",
                      )}
                      style={{ backgroundColor: occupationColor(slot.value, 1) }}
                    >
                      {edited ? "M" : fromGoogle ? "G" : ""}
                      {notes.length > 0 && (
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
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {[
          { value: 0, text: "1 · Libre" },
          { value: 0.5, text: "0,5 · Lo podría mover" },
          { value: 1, text: "0 · No lo puedo mover" },
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
        <li className="flex items-center gap-1.5">
          <span
            aria-hidden
            className="flex size-3 items-center justify-center rounded-[3px] text-[0.5rem] font-semibold ring-1 ring-inset ring-current"
          >
            M
          </span>
          Editado a mano (manda sobre Google)
        </li>
        <li className="flex items-center gap-1.5">
          <span aria-hidden className="size-1.5 rounded-full bg-current" />
          Tiene una nota
        </li>
      </ul>

      {selection && mode === "note" && (
        <NoteForm
          key={JSON.stringify(selection)}
          action={createNote}
          rect={selection}
          submitLabel="Guardar nota"
          onDone={reset}
          onCancel={reset}
        />
      )}

      <section className="flex flex-col gap-2">
        <h3 className="text-base font-semibold">Tus notas de esta semana</h3>
        <NoteList
          notes={week.notes}
          editable
          empty="No tienes notas esta semana. Usa «Añadir nota» para avisar al equipo, por ejemplo «No puedo presencial»."
        />
      </section>
    </div>
  );
}
