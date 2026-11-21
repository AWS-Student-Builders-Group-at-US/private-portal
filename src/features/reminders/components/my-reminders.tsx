"use client";

import { useActionState, useCallback, useEffect, useId, useState, useTransition } from "react";
import { BellPlus, MailCheck, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDay } from "@/features/availability/dates";
import { createReminder, deleteReminder, updateReminder } from "../actions";
import { REMINDER_NOTE_MAX, REMINDER_TITLE_MAX } from "../schema";
import type { Reminder, ReminderFormState } from "../types";

const fieldClass =
  "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive [color-scheme:light] dark:[color-scheme:dark]";

type ReminderAction = (
  prev: ReminderFormState,
  formData: FormData,
) => Promise<ReminderFormState>;

// "Mis recordatorios" on the panel home: the member's own reminders (only
// they see them), each emailed to them on its date by the daily cron.
export function MyReminders({ reminders, today }: { reminders: Reminder[]; today: string }) {
  const [adding, setAdding] = useState(false);
  const close = useCallback(() => setAdding(false), []);

  return (
    <section className="flex flex-col gap-3" aria-labelledby="my-reminders">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="my-reminders" className="text-lg font-semibold">
          Mis recordatorios
        </h2>
        {!adding && (
          <Button variant="outline" size="sm" onClick={() => setAdding(true)}>
            <BellPlus data-icon="inline-start" />
            Nuevo recordatorio
          </Button>
        )}
      </div>
      {adding && (
        <ReminderForm
          action={createReminder}
          today={today}
          title="Nuevo recordatorio"
          submitLabel="Guardar recordatorio"
          onDone={close}
          onCancel={close}
        />
      )}
      {reminders.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No tienes recordatorios. Te enviamos un correo el día que elijas; solo tú los ves.
        </p>
      ) : (
        <ul className="divide-y rounded-lg border">
          {reminders.map((reminder) => (
            <ReminderRow key={reminder.id} reminder={reminder} today={today} />
          ))}
        </ul>
      )}
    </section>
  );
}

function ReminderRow({ reminder, today }: { reminder: Reminder; today: string }) {
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const close = useCallback(() => setEditing(false), []);

  if (editing) {
    return (
      <li className="px-4 py-3">
        <ReminderForm
          action={updateReminder.bind(null, reminder.id)}
          reminder={reminder}
          today={today}
          title="Editar recordatorio"
          submitLabel="Guardar cambios"
          onDone={close}
          onCancel={close}
        />
      </li>
    );
  }

  function remove() {
    setError(null);
    startTransition(async () => {
      const result = await deleteReminder(reminder.id);
      if (!result.ok) setError(result.message);
    });
  }

  return (
    <li className="flex items-start justify-between gap-3 px-4 py-3">
      <div className="flex min-w-0 flex-col gap-0.5">
        <p className="font-medium break-words">{reminder.title}</p>
        <p className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
          <span className="first-letter:uppercase">{formatDay(reminder.remind_on)}</span>
          {reminder.sent_at ? (
            <>
              {" · "}
              <MailCheck aria-hidden className="size-3.5" />
              Enviado
            </>
          ) : reminder.remind_on < today ? (
            " · Pendiente de envío"
          ) : null}
        </p>
        {reminder.note && (
          <p className="text-sm whitespace-pre-wrap break-words">{reminder.note}</p>
        )}
        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
      </div>
      <div className="flex shrink-0 gap-1">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setEditing(true)}
          aria-label={`Editar «${reminder.title}»`}
        >
          <Pencil />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={remove}
          disabled={pending}
          aria-label={`Eliminar «${reminder.title}»`}
        >
          <Trash2 />
        </Button>
      </div>
    </li>
  );
}

function ReminderForm({
  action,
  reminder,
  today,
  title,
  submitLabel,
  onDone,
  onCancel,
}: {
  action: ReminderAction;
  reminder?: Reminder;
  today: string;
  title: string;
  submitLabel: string;
  onDone: () => void;
  onCancel: () => void;
}) {
  const id = useId();
  const [state, formAction, pending] = useActionState(action, {});
  const errors = (name: string) => state.fieldErrors?.[name];

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
      <h3 id={`${id}-heading`} className="font-medium">
        {title}
      </h3>
      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <div className="flex flex-col gap-1">
          <label htmlFor={`${id}-title`} className="text-sm font-medium">
            ¿Qué quieres recordar?
          </label>
          <input
            id={`${id}-title`}
            name="title"
            required
            maxLength={REMINDER_TITLE_MAX}
            defaultValue={reminder?.title ?? ""}
            autoFocus
            aria-invalid={!!errors("title")}
            className={fieldClass}
          />
          <FieldErrors errors={errors("title")} />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor={`${id}-date`} className="text-sm font-medium">
            Fecha
          </label>
          <input
            id={`${id}-date`}
            name="remind_on"
            type="date"
            required
            min={today}
            defaultValue={reminder && reminder.remind_on >= today ? reminder.remind_on : today}
            aria-invalid={!!errors("remind_on")}
            className={fieldClass}
          />
          <FieldErrors errors={errors("remind_on")} />
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor={`${id}-note`} className="text-sm font-medium">
          Nota <span className="font-normal text-muted-foreground">(opcional)</span>
        </label>
        <textarea
          id={`${id}-note`}
          name="note"
          rows={2}
          maxLength={REMINDER_NOTE_MAX}
          defaultValue={reminder?.note ?? ""}
          aria-invalid={!!errors("note")}
          className={fieldClass}
        />
        <FieldErrors errors={errors("note")} />
      </div>
      <p className="text-xs text-muted-foreground">
        Te llega un correo a primera hora del día elegido.
      </p>
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
