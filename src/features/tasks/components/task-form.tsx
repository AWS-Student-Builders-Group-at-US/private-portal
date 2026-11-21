"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  TASK_LINK_MAX,
  TASK_PRIORITIES,
  TASK_PRIORITY_LABELS,
  TASK_STATUSES,
  TASK_STATUS_LABELS,
} from "../schema";
import type { EventOption, MemberOption, TaskFormState } from "../types";

const fieldClass =
  "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive";

export type TaskFormValues = {
  title: string;
  description: string;
  status: string;
  // Checked assignees, comma-separated.
  assignee_emails: string;
  due_date: string;
  event_id: string;
  priority: string;
  link_url: string;
  // "on" when checked.
  email_reminder: string;
};

export const EMPTY_TASK: TaskFormValues = {
  title: "",
  description: "",
  status: "todo",
  assignee_emails: "",
  due_date: "",
  event_id: "",
  priority: "",
  link_url: "",
  email_reminder: "",
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
  // Missing fields fall back to EMPTY_TASK. Server pages pass only what they
  // set: EMPTY_TASK imported into a server component is a client reference,
  // not the object, so spreading it there adds nothing.
  initialValues?: Partial<TaskFormValues>;
  members: MemberOption[];
  events: EventOption[];
  submitLabel: string;
  cancelHref: string;
  // Panel path to go back to after saving (e.g. the event page).
  returnTo?: string;
};

export function TaskForm({
  action,
  initialValues,
  members,
  events,
  submitLabel,
  cancelHref,
  returnTo,
}: Props) {
  const [state, formAction, pending] = useActionState(action, {});
  // After a failed submit, show what the user typed instead of the initial values.
  const value = (name: keyof TaskFormValues): string =>
    state.values?.[name] ?? initialValues?.[name] ?? EMPTY_TASK[name];
  const errors = (name: string) => state.fieldErrors?.[name];
  const invalid = (name: string) =>
    state.fieldErrors?.[name]
      ? { "aria-invalid": true, "aria-describedby": `${name}-error` }
      : {};

  // Keep a removed member selectable so editing doesn't drop it silently.
  const assignees = value("assignee_emails").split(",").filter(Boolean);
  const memberOptions = [
    ...members,
    ...assignees
      .filter((email) => !members.some((m) => m.email === email))
      .map((email) => ({ email, name: email })),
  ];
  // Errors of the list and of each entry ("assignee_emails.0", …), once each.
  const assigneeErrors = [
    ...new Set(
      Object.entries(state.fieldErrors ?? {})
        .filter(([name]) => name.startsWith("assignee_emails"))
        .flatMap(([, list]) => list ?? []),
    ),
  ];

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
      <div className="grid gap-4 sm:grid-cols-3">
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
        <Field name="priority" label="Prioridad" errors={errors("priority")}>
          <select
            id="priority"
            name="priority"
            defaultValue={value("priority")}
            className={fieldClass}
            {...invalid("priority")}
          >
            <option value="">Sin prioridad</option>
            {TASK_PRIORITIES.map((priority) => (
              <option key={priority} value={priority}>
                {TASK_PRIORITY_LABELS[priority]}
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
      <label className="flex cursor-pointer items-start gap-2 text-sm">
        <input
          type="checkbox"
          name="email_reminder"
          defaultChecked={value("email_reminder") === "on"}
          className="mt-0.5 size-4"
          aria-describedby="email_reminder-help"
        />
        <span className="flex flex-col gap-0.5">
          <span className="font-medium">Recordarme por correo</span>
          <span id="email_reminder-help" className="text-xs text-muted-foreground">
            Cada responsable recibe un correo el día antes de la fecha límite (si la tarea
            no está hecha).
          </span>
        </span>
      </label>
      <Field name="link_url" label="Enlace (opcional)" errors={errors("link_url")}>
        <input
          id="link_url"
          name="link_url"
          type="url"
          inputMode="url"
          maxLength={TASK_LINK_MAX}
          placeholder="https://…"
          defaultValue={value("link_url")}
          className={fieldClass}
          {...invalid("link_url")}
        />
      </Field>
      <fieldset
        className="flex flex-col gap-1.5"
        aria-describedby={assigneeErrors.length > 0 ? "assignee_emails-error" : undefined}
      >
        <legend className="mb-1.5 text-sm font-medium">Responsables</legend>
        <div className="flex flex-wrap gap-2">
          {memberOptions.map((member) => (
            <label
              key={member.email}
              className="flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1 text-sm has-[:checked]:border-foreground has-[:checked]:bg-muted"
            >
              <input
                type="checkbox"
                name="assignee_emails"
                value={member.email}
                defaultChecked={assignees.includes(member.email)}
                className="size-3.5"
              />
              {member.name}
            </label>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          Marca una o varias personas. Sin ninguna, la tarea queda sin asignar.
        </p>
        {assigneeErrors.map((error) => (
          <p key={error} id="assignee_emails-error" className="text-sm text-destructive">
            {error}
          </p>
        ))}
      </fieldset>
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
