"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { PERSON_ME, PERSON_UNASSIGNED } from "../filters";
import type { EventOption, MemberOption } from "../types";

const fieldClass =
  "rounded-lg border border-input bg-background px-3 py-1.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

// Filter controls; the state lives in the URL (?persona=…&evento=…).
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

  function apply(next: { persona?: string; evento?: string }) {
    const params = new URLSearchParams();
    const p = next.persona ?? persona;
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

  const mine = persona === PERSON_ME;

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
        onClick={() => apply({ persona: mine ? "" : PERSON_ME })}
      >
        Mis tareas
      </Button>
      <div className="flex flex-col gap-1">
        <label htmlFor="filter-persona" className="text-xs text-muted-foreground">
          Persona
        </label>
        <select
          id="filter-persona"
          value={persona}
          onChange={(e) => apply({ persona: e.target.value })}
          className={fieldClass}
        >
          <option value="">Todas</option>
          <option value={PERSON_ME}>Yo</option>
          <option value={PERSON_UNASSIGNED}>Sin asignar</option>
          {members.map((member) => (
            <option key={member.email} value={member.email}>
              {member.name}
            </option>
          ))}
        </select>
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
      {(persona || evento) && (
        <Button variant="ghost" onClick={() => apply({ persona: "", evento: "" })}>
          Quitar filtros
        </Button>
      )}
    </div>
  );
}
