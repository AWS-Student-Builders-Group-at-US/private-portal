"use client";

import { useActionState, useEffect, useId } from "react";
import { Button } from "@/components/ui/button";
import { formatNoteRange, type NoteRect } from "../notes";
import { NOTE_BODY_MAX, NOTE_TITLE_MAX } from "../schema";
import type { NoteFormState } from "../types";

const fieldClass =
  "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive";

type NoteAction = (prev: NoteFormState, formData: FormData) => Promise<NoteFormState>;

// Title + content of a note. With `rect`, the selected rectangle travels as
// hidden fields (new note); without it, only the text is edited.
export function NoteForm({
  action,
  rect,
  defaults,
  submitLabel,
  onDone,
  onCancel,
}: {
  action: NoteAction;
  rect: NoteRect;
  defaults?: { title: string; body: string };
  submitLabel: string;
  onDone: () => void;
  onCancel: () => void;
}) {
  const id = useId();
  const [state, formAction, pending] = useActionState(action, {});
  const errors = (name: string) => state.fieldErrors?.[name];
  const rangeErrors = ["start_date", "end_date", "start_minute", "end_minute"].flatMap(
    (name) => errors(name) ?? [],
  );

  useEffect(() => {
    if (state.ok) onDone();
  }, [state, onDone]);

  return (
    <form action={formAction} noValidate className="flex max-w-xl flex-col gap-3">
      <p className="text-sm">
        <span className="text-muted-foreground">Franja: </span>
        <span className="font-medium">{formatNoteRange(rect)}</span>
      </p>
      {!defaults && (
        <>
          <input type="hidden" name="start_date" value={rect.start_date} />
          <input type="hidden" name="end_date" value={rect.end_date} />
          <input type="hidden" name="start_minute" value={rect.start_minute} />
          <input type="hidden" name="end_minute" value={rect.end_minute} />
        </>
      )}
      <FieldErrors errors={rangeErrors} />
      <div className="flex flex-col gap-1">
        <label htmlFor={`${id}-title`} className="text-sm font-medium">
          Título
        </label>
        <input
          id={`${id}-title`}
          name="title"
          required
          maxLength={NOTE_TITLE_MAX}
          defaultValue={defaults?.title}
          placeholder="Por ejemplo: No puedo presencial"
          autoFocus
          aria-invalid={!!errors("title")}
          className={fieldClass}
        />
        <FieldErrors errors={errors("title")} />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor={`${id}-body`} className="text-sm font-medium">
          Contenido <span className="font-normal text-muted-foreground">(opcional)</span>
        </label>
        <textarea
          id={`${id}-body`}
          name="body"
          rows={3}
          maxLength={NOTE_BODY_MAX}
          defaultValue={defaults?.body}
          aria-invalid={!!errors("body")}
          className={fieldClass}
        />
        <FieldErrors errors={errors("body")} />
      </div>
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
