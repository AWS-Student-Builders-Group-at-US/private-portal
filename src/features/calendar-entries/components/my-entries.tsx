"use client";

import { EmptyState } from "@/components/empty-state";
import { ShowMore } from "@/components/show-more";
import { useCallback, useState, useTransition } from "react";
import { CalendarPlus, ExternalLink, Pencil, Trash2, Users, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDay } from "@/features/availability/dates";
import { utcIsoToMadridLocal } from "@/features/events/time";
import {
  createCalendarEntry,
  deleteCalendarEntry,
  updateCalendarEntry,
} from "../actions";
import type { CalendarEntry } from "../types";
import { EntryForm } from "./entry-form";

// "Tus entradas": the member's own calendar entries of the shown week, with
// "Añadir al calendario", edit and delete.
export function MyEntries({
  entries,
  defaultDate,
  canSchedule = false,
}: {
  entries: CalendarEntry[];
  defaultDate: string;
  canSchedule?: boolean;
}) {
  const [adding, setAdding] = useState(false);
  const close = useCallback(() => setAdding(false), []);

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-base font-semibold">Tus entradas de esta semana</h3>
        {!adding && (
          <Button variant="outline" size="sm" onClick={() => setAdding(true)}>
            <CalendarPlus data-icon="inline-start" />
            Añadir al calendario
          </Button>
        )}
      </div>
      {adding && (
        <EntryForm
          action={createCalendarEntry}
          defaultDate={defaultDate}
          title="Nueva entrada en tu calendario"
          submitLabel="Guardar entrada"
          canSchedule={canSchedule}
          onDone={close}
          onCancel={close}
        />
      )}
      {entries.length === 0 ? (
        <EmptyState>
          No tienes entradas esta semana. Con «Añadir al calendario» apuntas algo en tu
          calendario: cuenta como ocupado y tú decides si los demás ven el título.
        </EmptyState>
      ) : (
        <ShowMore limit={ENTRIES_SHOWN} noun="entradas" className="divide-y rounded-lg border">
          {entries.map((entry) => (
            <EntryRow key={entry.id} entry={entry} canSchedule={canSchedule} />
          ))}
        </ShowMore>
      )}
    </section>
  );
}

// Entries (and group meetings) listed before "Ver más".
export const ENTRIES_SHOWN = 5;

export function formatEntryRange(entry: { starts_at: string; ends_at: string }) {
  const start = utcIsoToMadridLocal(entry.starts_at);
  const end = utcIsoToMadridLocal(entry.ends_at);
  return `${formatDay(start.slice(0, 10))} · ${start.slice(11, 16)}–${end.slice(11, 16)}`;
}

// One entry with edit and delete when it is the member's own, or when it is
// a group meeting and the member is a meeting organizer (`canSchedule`).
// `author` names the owner of someone else's entry; `meetingOnly` edits it as
// a group meeting.
export function EntryRow({
  entry,
  author,
  meetingOnly = false,
  canSchedule = false,
}: {
  entry: CalendarEntry;
  author?: string;
  meetingOnly?: boolean;
  canSchedule?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const close = useCallback(() => setEditing(false), []);
  const canEdit = entry.is_own || (entry.is_group_meeting && canSchedule);

  if (editing) {
    return (
      <li className="px-4 py-3">
        <EntryForm
          action={updateCalendarEntry.bind(null, entry.id)}
          entry={entry}
          defaultDate={utcIsoToMadridLocal(entry.starts_at).slice(0, 10)}
          title={meetingOnly ? "Editar reunión" : "Editar entrada"}
          submitLabel="Guardar cambios"
          meetingOnly={meetingOnly}
          canSchedule={canSchedule}
          onDone={close}
          onCancel={close}
        />
      </li>
    );
  }

  function remove() {
    setError(null);
    startTransition(async () => {
      const result = await deleteCalendarEntry(entry.id);
      if (!result.ok) setError(result.message);
    });
  }

  return (
    <li className="flex items-start justify-between gap-3 px-4 py-3">
      <div className="flex min-w-0 flex-col gap-0.5">
        <p className="font-medium break-words">{entry.title}</p>
        <p className="text-sm text-muted-foreground">
          {formatEntryRange(entry)}
          {author && ` · ${author}`}
        </p>
        <p className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
          {entry.is_group_meeting ? (
            <>
              <Users aria-hidden className="size-3" />
              Reunión del grupo · en el calendario compartido
            </>
          ) : entry.visibility === "busy" ? (
            "Los demás solo ven que estás ocupado"
          ) : (
            "Los demás ven el título y las notas"
          )}
        </p>
        {entry.is_group_meeting && entry.meeting_url && (
          <a
            href={entry.meeting_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex w-fit items-center gap-1 text-sm font-medium underline-offset-4 hover:underline"
          >
            <Video aria-hidden className="size-3.5" />
            Unirse a la reunión
            <ExternalLink aria-hidden className="size-3" />
          </a>
        )}
        {entry.notes && (
          <p className="text-sm whitespace-pre-wrap break-words">{entry.notes}</p>
        )}
        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
      </div>
      {canEdit && (
        <div className="flex shrink-0 gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setEditing(true)}
            aria-label={`Editar «${entry.title}»`}
          >
            <Pencil />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={remove}
            disabled={pending}
            aria-label={`Eliminar «${entry.title}»`}
          >
            <Trash2 />
          </Button>
        </div>
      )}
    </li>
  );
}
