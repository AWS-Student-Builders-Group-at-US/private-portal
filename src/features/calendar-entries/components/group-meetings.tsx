"use client";

import { EmptyState } from "@/components/empty-state";
import { ShowMore } from "@/components/show-more";
import { useCallback, useState } from "react";
import { CalendarPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createCalendarEntry } from "../actions";
import type { CalendarEntry } from "../types";
import { EntryForm } from "./entry-form";
import { ENTRIES_SHOWN, EntryRow } from "./my-entries";

// "Reuniones del grupo" on the "Equipo" tab: "Programar reunión" saves a
// calendar entry marked as a group meeting (it goes to the shared iCal feed),
// and the week's meetings are listed. Only meeting organizers (the common
// account and the members it authorizes in Ajustes) see the button and can
// edit or delete meetings; the database enforces it.
export function GroupMeetings({
  meetings,
  authors,
  defaultDate,
  canSchedule,
  defaultMeetingUrl,
}: {
  meetings: CalendarEntry[];
  authors: Record<string, string>;
  defaultDate: string;
  canSchedule: boolean;
  defaultMeetingUrl: string | null;
}) {
  const [adding, setAdding] = useState(false);
  const close = useCallback(() => setAdding(false), []);

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">Reuniones del grupo</h2>
        {canSchedule && !adding && (
          <Button variant="outline" size="sm" onClick={() => setAdding(true)}>
            <CalendarPlus data-icon="inline-start" />
            Programar reunión
          </Button>
        )}
      </div>
      {adding && (
        <EntryForm
          action={createCalendarEntry}
          defaultDate={defaultDate}
          title="Nueva reunión del grupo"
          submitLabel="Programar reunión"
          meetingOnly
          canSchedule
          defaultMeetingUrl={defaultMeetingUrl}
          onDone={close}
          onCancel={close}
        />
      )}
      {meetings.length === 0 ? (
        <EmptyState>
          {canSchedule
            ? "No hay reuniones del grupo esta semana. Con «Programar reunión» creas una que verá todo el equipo, aquí y en el calendario compartido."
            : "No hay reuniones del grupo esta semana."}
        </EmptyState>
      ) : (
        <ShowMore limit={ENTRIES_SHOWN} noun="reuniones" className="divide-y rounded-lg border">
          {meetings.map((meeting) => (
            <EntryRow
              key={meeting.id}
              entry={meeting}
              author={
                meeting.is_own
                  ? "Tú"
                  : (authors[meeting.member_email] ?? "Alguien del equipo")
              }
              meetingOnly
              canSchedule={canSchedule}
            />
          ))}
        </ShowMore>
      )}
    </section>
  );
}
