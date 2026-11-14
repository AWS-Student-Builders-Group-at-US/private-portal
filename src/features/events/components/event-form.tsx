"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import type { EventFormState } from "../types";

const fieldClass =
  "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive";

// Initial values use the form field names; times are Madrid `datetime-local` values.
export type EventFormValues = {
  title: string;
  description: string;
  starts_at: string;
  ends_at: string;
  location: string;
  meetup_url: string;
  expected_attendees: string;
  is_public: boolean;
};

const EMPTY: EventFormValues = {
  title: "",
  description: "",
  starts_at: "",
  ends_at: "",
  location: "",
  meetup_url: "",
  expected_attendees: "",
  is_public: false,
};

function Field({
  name,
  label,
  errors,
  children,
}: {
  name: string;
  label: string;
  errors?: string[];
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={name} className="text-sm font-medium">
        {label}
      </label>
      {children}
      {errors?.map((error) => (
        <p key={error} id={`${name}-error`} className="text-sm text-destructive">
          {error}
        </p>
      ))}
    </div>
  );
}

type Props = {
  action: (state: EventFormState, formData: FormData) => Promise<EventFormState>;
  initialValues?: EventFormValues;
  submitLabel: string;
  cancelHref: string;
};

export function EventForm({
  action,
  initialValues = EMPTY,
  submitLabel,
  cancelHref,
}: Props) {
  const [state, formAction, pending] = useActionState(action, {});
  // After a failed submit, show what the user typed instead of the initial values.
  const value = (name: Exclude<keyof EventFormValues, "is_public">) =>
    state.values?.[name] ?? initialValues[name];
  const isPublic = state.values
    ? state.values.is_public === "on"
    : initialValues.is_public;

  const errors = (name: string) => state.fieldErrors?.[name];
  const invalid = (name: string) =>
    state.fieldErrors?.[name]
      ? { "aria-invalid": true, "aria-describedby": `${name}-error` }
      : {};

  return (
    <form action={formAction} className="flex max-w-xl flex-col gap-4" noValidate>
      <Field name="title" label="Título" errors={errors("title")}>
        <input
          id="title"
          name="title"
          required
          maxLength={200}
          defaultValue={value("title")}
          className={fieldClass}
          {...invalid("title")}
        />
      </Field>
      <Field name="description" label="Descripción" errors={errors("description")}>
        <textarea
          id="description"
          name="description"
          rows={4}
          defaultValue={value("description")}
          className={fieldClass}
          {...invalid("description")}
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field name="starts_at" label="Inicio (hora de Madrid)" errors={errors("starts_at")}>
          <input
            id="starts_at"
            name="starts_at"
            type="datetime-local"
            required
            defaultValue={value("starts_at")}
            className={fieldClass}
            {...invalid("starts_at")}
          />
        </Field>
        <Field name="ends_at" label="Fin (opcional)" errors={errors("ends_at")}>
          <input
            id="ends_at"
            name="ends_at"
            type="datetime-local"
            defaultValue={value("ends_at")}
            className={fieldClass}
            {...invalid("ends_at")}
          />
        </Field>
      </div>
      <Field name="location" label="Lugar" errors={errors("location")}>
        <input
          id="location"
          name="location"
          defaultValue={value("location")}
          className={fieldClass}
          {...invalid("location")}
        />
      </Field>
      <Field name="meetup_url" label="Enlace de Meetup" errors={errors("meetup_url")}>
        <input
          id="meetup_url"
          name="meetup_url"
          type="url"
          placeholder="https://www.meetup.com/…"
          defaultValue={value("meetup_url")}
          className={fieldClass}
          {...invalid("meetup_url")}
        />
      </Field>
      <Field name="expected_attendees" label="Asistentes previstos" errors={errors("expected_attendees")}>
        <input
          id="expected_attendees"
          name="expected_attendees"
          type="number"
          min={0}
          step={1}
          inputMode="numeric"
          defaultValue={value("expected_attendees")}
          className={fieldClass}
          {...invalid("expected_attendees")}
        />
      </Field>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="is_public"
          defaultChecked={isPublic}
          className="size-4"
        />
        Mostrar en la web pública
      </label>

      {state.message && (
        <p className="text-sm text-destructive" role="alert">
          {state.message}
        </p>
      )}

      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Guardando…" : submitLabel}
        </Button>
        <Link href={cancelHref} className={buttonVariants({ variant: "outline" })}>
          Cancelar
        </Link>
      </div>
    </form>
  );
}
