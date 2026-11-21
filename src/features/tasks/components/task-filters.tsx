"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Popover } from "@base-ui/react/popover";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PERSON_ME, PERSON_UNASSIGNED } from "../filters";
import type { EventOption, MemberOption } from "../types";

const fieldClass =
  "rounded-lg border border-input bg-background px-3 py-1.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

// Filter controls; the state lives in the URL (?persona=yo,ana@…&evento=…).
// `persona` is the comma-separated list of selected people.
export function TaskFilters({
  persona,
  evento,
  members,
  events,
}: {
  persona: string;
  evento: string;
  members: MemberOption[];
  events: EventOption[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const selected = persona.split(",").filter(Boolean);

  function apply(next: { persona?: string[]; evento?: string }) {
    const params = new URLSearchParams();
    const p = (next.persona ?? selected).join(",");
    const e = next.evento ?? evento;
    if (p) params.set("persona", p);
    if (e) params.set("evento", e);
    const query = params.toString();
    startTransition(() => {
      router.replace(query ? `/panel/tareas?${query}` : "/panel/tareas", {
        scroll: false,
      });
    });
  }

  function toggle(value: string) {
    apply({
      persona: selected.includes(value)
        ? selected.filter((v) => v !== value)
        : [...selected, value],
    });
  }

  const people = [
    { value: PERSON_ME, label: "Yo" },
    { value: PERSON_UNASSIGNED, label: "Sin asignar" },
    ...members.map((member) => ({ value: member.email, label: member.name })),
  ];
  const labels = new Map(people.map((p) => [p.value, p.label]));
  const summary =
    selected.length === 0
      ? "Todas"
      : selected.length <= 2
        ? selected.map((value) => labels.get(value) ?? value).join(", ")
        : `${selected.length} personas`;
  const mine = selected.includes(PERSON_ME);

  return (
    <div
      className="flex flex-wrap items-end gap-3"
      aria-busy={pending}
      role="group"
      aria-label="Filtros"
    >
      <Button
        variant={mine ? "default" : "outline"}
        aria-pressed={mine}
        onClick={() => toggle(PERSON_ME)}
      >
        Mis tareas
      </Button>
      <div className="flex flex-col gap-1">
        <span id="filter-persona-label" className="text-xs text-muted-foreground">
          Personas
        </span>
        <Popover.Root>
          <Popover.Trigger
            aria-labelledby="filter-persona-label"
            className={`${fieldClass} flex min-w-40 items-center justify-between gap-2`}
          >
            <span className="max-w-56 truncate">{summary}</span>
            <ChevronDown className="size-4 shrink-0 opacity-60" aria-hidden />
          </Popover.Trigger>
          <Popover.Portal>
            <Popover.Positioner sideOffset={4} align="start" className="z-30">
              <Popover.Popup className="flex max-h-80 w-56 flex-col gap-0.5 overflow-y-auto rounded-lg border bg-popover p-1 text-sm text-popover-foreground shadow-md outline-none">
                {people.map((person) => (
                  <label
                    key={person.value}
                    className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted"
                  >
                    <input
                      type="checkbox"
                      checked={selected.includes(person.value)}
                      onChange={() => toggle(person.value)}
                      className="size-3.5"
                    />
                    {person.label}
                  </label>
                ))}
              </Popover.Popup>
            </Popover.Positioner>
          </Popover.Portal>
        </Popover.Root>
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="filter-evento" className="text-xs text-muted-foreground">
          Evento
        </label>
        <select
          id="filter-evento"
          value={evento}
          onChange={(e) => apply({ evento: e.target.value })}
          className={`${fieldClass} max-w-64`}
        >
          <option value="">Todos</option>
          {events.map((event) => (
            <option key={event.id} value={event.id}>
              {event.title}
            </option>
          ))}
        </select>
      </div>
      {(selected.length > 0 || evento) && (
        <Button variant="ghost" onClick={() => apply({ persona: [], evento: "" })}>
          Quitar filtros
        </Button>
      )}
    </div>
  );
}
