"use client";

import { useActionState, useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { addOverride, deleteOverride } from "../actions";
import { formatDay } from "../dates";
import type { Override, OverrideFormState } from "../types";

const fieldClass =
  "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive";

const KIND_LABELS = { free: "Libre", busy: "Ocupado" } as const;

// One-off changes for specific dates, on top of the weekly template.
export function OverridesPanel({
  overrides,
  today,
}: {
  overrides: Override[];
  today: string;
}) {
  const [state, formAction, pending] = useActionState(
    async (prev: OverrideFormState, formData: FormData) => {
      const result = await addOverride(prev, formData);
      return result;
    },
    {},
  );
  const errors = (name: string) => state.fieldErrors?.[name];
  const value = (name: string, fallback = "") => state.values?.[name] ?? fallback;
  // Reset the form after a successful save by remounting it.
  const formKey = state.ok ? `ok-${overrides.length}` : "form";

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        Para días concretos que no siguen tu semana habitual: márcate libre u
        ocupado en una franja. Ocupado siempre gana.
      </p>
      <form
        key={formKey}
        action={formAction}
        noValidate
        className="grid max-w-xl gap-3 sm:grid-cols-[1fr_auto_auto]"
      >
        <div className="flex flex-col gap-1 sm:col-span-3">
          <label htmlFor="override-date" className="text-sm font-medium">
            Fecha
          </label>
          <input
            id="override-date"
            name="date"
            type="date"
            min={today}
            defaultValue={value("date", today)}
            aria-invalid={!!errors("date")}
            className={fieldClass}
          />
          <FieldErrors errors={errors("date")} />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="override-start" className="text-sm font-medium">
            Desde
          </label>
          <input
            id="override-start"
            name="start_time"
            type="time"
            step={1800}
            defaultValue={value("start_time", "10:00")}
            aria-invalid={!!errors("start_time")}
            className={fieldClass}
          />
          <FieldErrors errors={errors("start_time")} />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="override-end" className="text-sm font-medium">
            Hasta
          </label>
          <input
            id="override-end"
            name="end_time"
            type="time"
            step={1800}
            defaultValue={value("end_time", "12:00")}
            aria-invalid={!!errors("end_time")}
            className={fieldClass}
          />
          <FieldErrors errors={errors("end_time")} />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="override-kind" className="text-sm font-medium">
            Estoy
          </label>
          <select
            id="override-kind"
            name="kind"
            defaultValue={value("kind", "busy")}
            className={fieldClass}
          >
            <option value="busy">Ocupado</option>
            <option value="free">Libre</option>
          </select>
        </div>
        <div className="flex items-center gap-3 sm:col-span-3">
          <Button type="submit" disabled={pending}>
            {pending ? "Guardando…" : "Añadir cambio"}
          </Button>
          {state.message && (
            <p className="text-sm text-destructive" role="alert">
              {state.message}
            </p>
          )}
        </div>
      </form>

      {overrides.length === 0 ? (
        <p className="text-sm text-muted-foreground">No tienes cambios próximos.</p>
      ) : (
        <ul className="divide-y rounded-lg border">
          {overrides.map((override) => (
            <OverrideRow key={override.id} override={override} />
          ))}
        </ul>
      )}
    </div>
  );
}

function FieldErrors({ errors }: { errors?: string[] }) {
  return errors?.map((error) => (
    <p key={error} className="text-sm text-destructive">
      {error}
    </p>
  ));
}

function OverrideRow({ override }: { override: Override }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  return (
    <li className="flex items-center justify-between gap-3 px-4 py-2 text-sm">
      <span>
        <span className="font-medium">{formatDay(override.date)}</span> ·{" "}
        {override.start_time}–{override.end_time} ·{" "}
        <span
          className={
            override.kind === "busy" ? "text-destructive" : "text-foreground"
          }
        >
          {KIND_LABELS[override.kind]}
        </span>
        {error && (
          <span className="ml-2 text-destructive" role="alert">
            {error}
          </span>
        )}
      </span>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Eliminar cambio"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await deleteOverride(override.id);
            setError(result.ok ? null : result.message);
          })
        }
      >
        <Trash2 />
      </Button>
    </li>
  );
}
