"use client";

import { useActionState, useEffect, useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { utcIsoToMadridLocal } from "@/features/events/time";
import { ENTRY_NOTES_MAX, ENTRY_TITLE_MAX } from "../schema";
import type { CalendarEntry, EntryFormState } from "../types";

const fieldClass =
  "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive [color-scheme:light] dark:[color-scheme:dark]";

type EntryAction = (prev: EntryFormState, formData: FormData) => Promise<EntryFormState>;

// Form for a new calendar entry or to edit one of the member's own entries.
// `meetingOnly` (the "Equipo" tab) always saves a group meeting, so it hides
// the group-meeting checkbox and the visibility choice.
export function EntryForm({
  action,
  entry,
  defaultDate,
  title,
  submitLabel,
  meetingOnly = false,
  onDone,
  onCancel,
}: {
  action: EntryAction;
  entry?: CalendarEntry;
  defaultDate: string;
  title: string;
  submitLabel: string;
  meetingOnly?: boolean;
  onDone: () => void;
  onCancel: () => void;
}) {
  const id = useId();
  const [state, formAction, pending] = useActionState(action, {});
  const [groupMeeting, setGroupMeeting] = useState(entry?.is_group_meeting ?? false);
  const errors = (name: string) => state.fieldErrors?.[name];
  const start = entry ? utcIsoToMadridLocal(entry.starts_at) : null;
  const end = entry ? utcIsoToMadridLocal(entry.ends_at) : null;

  useEffect(() => {
    if (state.ok) onDone();
  }, [state, onDone]);

  return (
    <form
      action={formAction}
      noValidate
      aria-labelledby={`${id}-heading`}
      className="flex max-w-xl flex-col gap-3 rounded-lg border p-4"
    >
      <h4 id={`${id}-heading`} className="font-medium">
        {title}
      </h4>
      <div className="flex flex-col gap-1">
        <label htmlFor={`${id}-title`} className="text-sm font-medium">
          Título
        </label>
        <input
          id={`${id}-title`}
          name="title"
          required
          maxLength={ENTRY_TITLE_MAX}
          defaultValue={entry?.title ?? ""}
          autoFocus
          aria-invalid={!!errors("title")}
          className={fieldClass}
        />
        <FieldErrors errors={errors("title")} />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="flex flex-col gap-1">
          <label htmlFor={`${id}-date`} className="text-sm font-medium">
            Fecha
          </label>
          <input
            id={`${id}-date`}
            name="date"
            type="date"
            required
            defaultValue={start?.slice(0, 10) ?? defaultDate}
            aria-invalid={!!errors("date")}
            className={fieldClass}
          />
          <FieldErrors errors={errors("date")} />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor={`${id}-start`} className="text-sm font-medium">
            Hora de inicio
          </label>
          <input
            id={`${id}-start`}
            name="start_time"
            type="time"
            required
            defaultValue={start?.slice(11, 16) ?? "10:00"}
            aria-invalid={!!errors("start_time")}
            className={fieldClass}
          />
          <FieldErrors errors={errors("start_time")} />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor={`${id}-end`} className="text-sm font-medium">
            Hora de fin
          </label>
          <input
            id={`${id}-end`}
            name="end_time"
            type="time"
            required
            defaultValue={end?.slice(11, 16) ?? "11:00"}
            aria-invalid={!!errors("end_time")}
            className={fieldClass}
          />
          <FieldErrors errors={errors("end_time")} />
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor={`${id}-notes`} className="text-sm font-medium">
          Notas <span className="font-normal text-muted-foreground">(opcional)</span>
        </label>
        <textarea
          id={`${id}-notes`}
          name="notes"
          rows={3}
          maxLength={ENTRY_NOTES_MAX}
          defaultValue={entry?.notes ?? ""}
          aria-invalid={!!errors("notes")}
          className={fieldClass}
        />
        <FieldErrors errors={errors("notes")} />
      </div>
      {meetingOnly ? (
        <>
          <input type="hidden" name="is_group_meeting" value="on" />
          <input type="hidden" name="visibility" value="details" />
          <p className="text-xs text-muted-foreground">
            Todo el equipo verá el título y las notas, y la reunión aparecerá en el calendario
            compartido.
          </p>
        </>
      ) : (
        <>
      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          name="is_group_meeting"
          checked={groupMeeting}
          onChange={(e) => setGroupMeeting(e.currentTarget.checked)}
          className="mt-0.5 size-4"
        />
        <span>
          Reunión del grupo{" "}
          <span className="text-muted-foreground">(aparece en el calendario compartido)</span>
        </span>
      </label>
      <fieldset className="flex flex-col gap-1.5" disabled={groupMeeting}>
        <legend className="mb-1 text-sm font-medium">¿Qué ven los demás?</legend>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="radio"
            name="visibility"
            value="details"
            defaultChecked={entry?.visibility !== "busy"}
          />
          Los demás ven el título y las notas
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="radio"
            name="visibility"
            value="busy"
            defaultChecked={entry?.visibility === "busy"}
          />
          Los demás solo ven que estoy ocupado
        </label>
        {groupMeeting && (
          <p className="text-xs text-muted-foreground">
            Las reuniones del grupo siempre muestran el título y las notas.
          </p>
        )}
        <FieldErrors errors={errors("visibility")} />
      </fieldset>
      {/* A disabled fieldset does not submit its radios. */}
      {groupMeeting && <input type="hidden" name="visibility" value="details" />}
        </>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Guardando…" : submitLabel}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel} disabled={pending}>
          Cancelar
        </Button>
        {state.message && (
          <p className="text-sm text-destructive" role="alert">
            {state.message}
          </p>
        )}
      </div>
    </form>
  );
}

function FieldErrors({ errors }: { errors?: string[] }) {
  return errors?.map((error) => (
    <p key={error} className="text-sm text-destructive">
      {error}
    </p>
  ));
}
