"use client";

import { useActionState, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  addCalendarFeed,
  deleteCalendarFeed,
  refreshMyCalendars,
  setCalendarFeedWeight,
  type FeedFormState,
} from "../actions";

export const WEIGHT_OPTIONS = [
  { value: "1", label: "No lo puedo mover (1)" },
  { value: "0.5", label: "Lo podría mover (0,5)" },
] as const;

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
      <fieldset className="flex flex-col gap-1.5">
        <legend className="mb-1.5 text-sm font-medium">Importancia de sus eventos</legend>
        {WEIGHT_OPTIONS.map((option) => (
          <label key={option.value} className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="weight"
              value={option.value}
              defaultChecked={option.value === "1"}
              className="size-3.5"
            />
            {option.label}
          </label>
        ))}
      </fieldset>
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

export function FeedWeightSelect({ id, weight }: { id: string; weight: 1 | 0.5 }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  return (
    <div className="flex flex-col gap-1">
      <select
        aria-label="Importancia de sus eventos"
        defaultValue={String(weight)}
        disabled={pending}
        onChange={(e) => {
          const value = e.currentTarget.value;
          startTransition(async () => {
            const result = await setCalendarFeedWeight(id, value);
            setError(result.ok ? null : result.message);
          });
        }}
        className="w-fit rounded-lg border border-input bg-background px-2 py-1 text-xs"
      >
        {WEIGHT_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && <p className="text-xs text-destructive" role="alert">{error}</p>}
    </div>
  );
}
