"use client";

import { useActionState, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  addCalendarFeed,
  deleteCalendarFeed,
  refreshMyCalendars,
  type FeedFormState,
} from "../actions";

const fieldClass =
  "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive";

export function AddFeedForm() {
  const [state, formAction, pending] = useActionState<FeedFormState, FormData>(
    addCalendarFeed,
    {},
  );
  const errors = state.fieldErrors ?? {};

  return (
    <form
      action={formAction}
      // Clear the inputs after a successful save.
      key={state.ok ? state.message : "form"}
      className="flex max-w-xl flex-col gap-3"
      noValidate
    >
      <div className="flex flex-col gap-1.5">
        <label htmlFor="feed-label" className="text-sm font-medium">
          Nombre
        </label>
        <input
          id="feed-label"
          name="label"
          maxLength={60}
          placeholder="Personal"
          defaultValue={state.ok ? "" : state.values?.label}
          aria-invalid={Boolean(errors.label)}
          className={fieldClass}
        />
        {errors.label?.map((e) => (
          <p key={e} className="text-sm text-destructive">{e}</p>
        ))}
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="feed-url" className="text-sm font-medium">
          Dirección secreta en formato iCal
        </label>
        <input
          id="feed-url"
          name="ics_url"
          type="url"
          autoComplete="off"
          placeholder="https://calendar.google.com/calendar/ical/…/basic.ics"
          aria-invalid={Boolean(errors.ics_url)}
          className={fieldClass}
        />
        {errors.ics_url?.map((e) => (
          <p key={e} className="text-sm text-destructive">{e}</p>
        ))}
      </div>
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Guardando…" : "Añadir calendario"}
        </Button>
        {state.message && (
          <p
            role={state.ok ? "status" : "alert"}
            className={state.ok ? "text-sm" : "text-sm text-destructive"}
          >
            {state.message}
          </p>
        )}
      </div>
    </form>
  );
}

export function DeleteFeedButton({ id }: { id: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        variant="outline"
        size="sm"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await deleteCalendarFeed(id);
            setError(result.ok ? null : result.message);
          })
        }
      >
        {pending ? "Eliminando…" : "Eliminar"}
      </Button>
      {error && <p className="text-xs text-destructive" role="alert">{error}</p>}
    </div>
  );
}

export function RefreshFeedsButton() {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="outline"
      disabled={pending}
      onClick={() => startTransition(async () => void (await refreshMyCalendars()))}
    >
      {pending ? "Actualizando…" : "Actualizar ahora"}
    </Button>
  );
}
