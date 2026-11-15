"use client";

import { useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { saveTemplate } from "../actions";
import {
  SLOTS_PER_DAY,
  WEEKDAY_LABELS,
  cellKey,
  cellsToTemplateRanges,
  minutesToTime,
  slotStart,
  templateToCells,
  type TemplateRange,
} from "../slots";

const SLOTS = Array.from({ length: SLOTS_PER_DAY }, (_, i) => i);

// Weekly template editor: press and drag over the grid to paint free time;
// starting on a painted cell erases instead. Keyboard: each cell toggles.
export function TemplatePainter({ initial }: { initial: TemplateRange[] }) {
  const [cells, setCells] = useState(() => templateToCells(initial));
  const [dirty, setDirty] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const paintMode = useRef<boolean | null>(null);

  function set(key: string, on: boolean) {
    setCells((current) => {
      if (current.has(key) === on) return current;
      const next = new Set(current);
      if (on) next.add(key);
      else next.delete(key);
      return next;
    });
    setDirty(true);
    setMessage(null);
  }

  function keyAt(x: number, y: number) {
    const el = document.elementFromPoint(x, y);
    return el instanceof HTMLElement ? el.dataset.cell : undefined;
  }

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    const key = (e.target as HTMLElement).dataset.cell;
    if (!key) return;
    e.preventDefault();
    paintMode.current = !cells.has(key);
    set(key, paintMode.current);
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (paintMode.current === null) return;
    const key = keyAt(e.clientX, e.clientY);
    if (key) set(key, paintMode.current);
  }

  function stopPainting() {
    paintMode.current = null;
  }

  function save() {
    startTransition(async () => {
      const result = await saveTemplate(cellsToTemplateRanges(cells));
      if (result.ok) {
        setDirty(false);
        setMessage({ ok: true, text: "Disponibilidad guardada." });
      } else {
        setMessage({ ok: false, text: result.message });
      }
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">
        Pinta las franjas en las que sueles estar libre cada semana; el resto
        de ese día contará como ocupado (1). Si no pintas nada, solo cuentan tus
        calendarios de Google y tus cambios por fecha. Pulsa y arrastra; si
        empiezas sobre una franja pintada, la borras.
      </p>
      <div className="overflow-x-auto">
        <div
          className="grid min-w-[28rem] touch-none select-none grid-cols-[3rem_repeat(7,minmax(0,1fr))] gap-px"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={stopPainting}
          onPointerCancel={stopPainting}
          onPointerLeave={stopPainting}
          role="grid"
          aria-label="Disponibilidad semanal"
        >
          <div />
          {WEEKDAY_LABELS.map((label) => (
            <div key={label} className="pb-1 text-center text-xs font-medium">
              {label}
            </div>
          ))}
          {SLOTS.map((slot) => {
            const time = minutesToTime(slotStart(slot));
            return (
              <div key={slot} className="contents" role="row">
                <div className="pr-1 text-right text-[0.65rem] leading-5 text-muted-foreground">
                  {slot % 2 === 0 ? time : ""}
                </div>
                {WEEKDAY_LABELS.map((label, weekday) => {
                  const key = cellKey(weekday, slot);
                  const on = cells.has(key);
                  return (
                    <button
                      key={key}
                      type="button"
                      data-cell={key}
                      aria-pressed={on}
                      aria-label={`${label} ${time}`}
                      // Pointer painting is handled on the grid; keyboard
                      // clicks (detail 0) toggle the cell.
                      onClick={(e) => {
                        if (e.detail === 0) set(key, !on);
                      }}
                      className={cn(
                        "h-5 rounded-[3px] outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        on ? "bg-primary" : "bg-muted hover:bg-muted-foreground/20",
                        slot % 2 === 0 && "mt-px",
                      )}
                    />
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={save} disabled={pending || !dirty}>
          {pending ? "Guardando…" : "Guardar disponibilidad"}
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            setCells(new Set());
            setDirty(true);
            setMessage(null);
          }}
          disabled={pending || cells.size === 0}
        >
          Vaciar
        </Button>
        {dirty && !message && (
          <span className="text-sm text-muted-foreground">Cambios sin guardar</span>
        )}
        {message && (
          <span
            role={message.ok ? "status" : "alert"}
            className={cn("text-sm", message.ok ? "text-foreground" : "text-destructive")}
          >
            {message.text}
          </span>
        )}
      </div>
    </div>
  );
}
