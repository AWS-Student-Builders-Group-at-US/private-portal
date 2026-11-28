"use client";

import { useActionState, useId, useState, useTransition } from "react";
import { CalendarCheck, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatMadridDateTimeShort } from "@/features/events/time";
import { removeMember, setMeetingOrganizer, updateMember } from "../actions";
import { canRemoveMember } from "../logic";
import { memberAreaLabel } from "../schema";
import type { MemberFormState, MemberRow } from "../types";
import { NameAndAreaFields } from "./member-fields";

const REMOVE_HINTS = {
  self: "No puedes eliminar tu propia cuenta.",
  last: "Es el último miembro del panel.",
} as const;

export function MemberItem({
  member,
  me,
  memberCount,
  canManage,
}: {
  member: MemberRow;
  me: string;
  memberCount: number;
  canManage: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [removing, startRemove] = useTransition();
  const [savingOrganizer, startOrganizer] = useTransition();
  const [organizer, setOrganizer] = useState(member.can_schedule_meetings);
  const removal = canRemoveMember({ me, target: member.email, memberCount });
  const isMe = member.email === me;

  const remove = () => {
    setError(null);
    startRemove(async () => {
      const result = await removeMember(member.email);
      if (!result.ok) {
        setError(result.message);
        setConfirming(false);
      }
    });
  };

  const toggleOrganizer = (enabled: boolean) => {
    setError(null);
    setOrganizer(enabled);
    startOrganizer(async () => {
      const result = await setMeetingOrganizer(member.email, enabled);
      if (!result.ok) {
        setOrganizer(!enabled);
        setError(result.message);
      }
    });
  };

  return (
    <li className="flex flex-col gap-3 px-4 py-3">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="flex min-w-0 flex-col gap-0.5">
          <p className="text-sm font-medium">
            {member.name}
            {isMe && <span className="ml-2 text-xs text-muted-foreground">(tú)</span>}
          </p>
          <p className="text-sm break-all text-muted-foreground">{member.email}</p>
          <p className="text-xs text-muted-foreground">
            {memberAreaLabel(member.area)} · Añadido el {formatMadridDateTimeShort(member.created_at)}
          </p>
          {canManage ? (
            <label className="mt-1 flex w-fit cursor-pointer items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={organizer}
                disabled={savingOrganizer}
                onChange={(e) => toggleOrganizer(e.currentTarget.checked)}
                className="size-3.5"
              />
              Puede programar reuniones del grupo
            </label>
          ) : (
            organizer && (
              <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                <CalendarCheck aria-hidden className="size-3" />
                Programa reuniones del grupo
              </p>
            )
          )}
        </div>
        {canManage && !editing && (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Editar a ${member.name}`}
              onClick={() => {
                setConfirming(false);
                setEditing(true);
              }}
            >
              <Pencil />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Quitar acceso a ${member.name}`}
              title={removal.ok ? undefined : REMOVE_HINTS[removal.reason]}
              disabled={!removal.ok || removing}
              onClick={() => setConfirming(true)}
            >
              <Trash2 />
            </Button>
          </div>
        )}
      </div>

      {canManage && confirming && (
        <div
          role="alertdialog"
          aria-label="Confirmar eliminación"
          className="flex flex-wrap items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm"
        >
          <span>
            ¿Quitar el acceso a {member.name}? Se borrarán sus votos, su disponibilidad y sus
            calendarios; sus tareas quedarán sin asignar y sus sugerencias se conservarán.
          </span>
          <div className="flex gap-2">
            <Button variant="destructive" size="sm" disabled={removing} onClick={remove}>
              {removing ? "Quitando…" : "Sí, quitar acceso"}
            </Button>
            <Button variant="outline" size="sm" disabled={removing} onClick={() => setConfirming(false)}>
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {canManage && editing && <EditMemberForm member={member} onDone={() => setEditing(false)} />}

      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </li>
  );
}

function EditMemberForm({ member, onDone }: { member: MemberRow; onDone: () => void }) {
  const [state, formAction, pending] = useActionState(
    async (prev: MemberFormState, formData: FormData) => {
      const next = await updateMember(prev, formData);
      if (next.ok) onDone();
      return next;
    },
    { values: { name: member.name, area: member.area ?? "" } },
  );
  const idPrefix = useId();

  return (
    <form action={formAction} noValidate className="flex flex-col gap-3">
      <input type="hidden" name="email" value={member.email} />
      <div className="grid gap-3 sm:grid-cols-2">
        <NameAndAreaFields idPrefix={idPrefix} values={state.values} fieldErrors={state.fieldErrors} />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Guardando…" : "Guardar"}
        </Button>
        <Button type="button" variant="outline" size="sm" disabled={pending} onClick={onDone}>
          Cancelar
        </Button>
        {state.message && (
          <p role="alert" className="text-sm text-destructive">
            {state.message}
          </p>
        )}
      </div>
    </form>
  );
}
