"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { TASK_STATUSES, TASK_STATUS_LABELS } from "../schema";
import type { EventOption, MemberOption, TaskFormState } from "../types";

const fieldClass =
  "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive";

export type TaskFormValues = {
  title: string;
  description: string;
  status: string;
  assignee_email: string;
  due_date: string;
  event_id: string;
};

export const EMPTY_TASK: TaskFormValues = {
  title: "",
  description: "",
  status: "todo",
  assignee_email: "",
  due_date: "",
  event_id: "",
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
  action: (state: TaskFormState, formData: FormData) => Promise<TaskFormState>;
  initialValues?: TaskFormValues;
  members: MemberOption[];
  events: EventOption[];
  submitLabel: string;
  cancelHref: string;
  // Panel path to go back to after saving (e.g. the event page).
  returnTo?: string;
};

export function TaskForm({
  action,
  initialValues = EMPTY_TASK,
  members,
  events,
  submitLabel,
  cancelHref,
  returnTo,
}: Props) {
  const [state, formAction, pending] = useActionState(action, {});
  // After a failed submit, show what the user typed instead of the initial values.
  const value = (name: keyof TaskFormValues) =>
    state.values?.[name] ?? initialValues[name];
  const errors = (name: string) => state.fieldErrors?.[name];
  const invalid = (name: string) =>
    state.fieldErrors?.[name]
      ? { "aria-invalid": true, "aria-describedby": `${name}-error` }
      : {};

  // Keep a removed member or event selectable so editing doesn't drop it silently.
  const assignee = value("assignee_email");
  const memberOptions =
    assignee && !members.some((m) => m.email === assignee)
      ? [...members, { email: assignee, name: assignee }]
      : members;

  return (
    <form action={formAction} className="flex max-w-xl flex-col gap-4" noValidate>
      {returnTo && <input type="hidden" name="return_to" value={returnTo} />}
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
        <Field name="status" label="Estado" errors={errors("status")}>
          <select
            id="status"
            name="status"
            defaultValue={value("status")}
            className={fieldClass}
            {...invalid("status")}
          >
            {TASK_STATUSES.map((status) => (
              <option key={status} value={status}>
                {TASK_STATUS_LABELS[status]}
              </option>
            ))}
          </select>
        </Field>
        <Field name="due_date" label="Fecha límite" errors={errors("due_date")}>
          <input
            id="due_date"
            name="due_date"
            type="date"
            defaultValue={value("due_date")}
            className={fieldClass}
            {...invalid("due_date")}
          />
        </Field>
      </div>
      <Field name="assignee_email" label="Responsable" errors={errors("assignee_email")}>
        <select
          id="assignee_email"
          name="assignee_email"
          defaultValue={assignee}
          className={fieldClass}
          {...invalid("assignee_email")}
        >
          <option value="">Sin asignar</option>
          {memberOptions.map((member) => (
            <option key={member.email} value={member.email}>
              {member.name}
            </option>
          ))}
        </select>
      </Field>
      <Field name="event_id" label="Evento (opcional)" errors={errors("event_id")}>
        <select
          id="event_id"
          name="event_id"
          defaultValue={value("event_id")}
          className={fieldClass}
          {...invalid("event_id")}
        >
          <option value="">Ninguno</option>
          {events.map((event) => (
            <option key={event.id} value={event.id}>
              {event.title}
            </option>
          ))}
        </select>
      </Field>

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
