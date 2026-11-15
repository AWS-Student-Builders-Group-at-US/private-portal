"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { addMember } from "../actions";
import type { MemberFormState } from "../types";
import { FieldErrors, NameAndAreaFields, fieldClass } from "./member-fields";

export function AddMemberForm() {
  // `sent` counts successful submits; it keys the form so the fields clear.
  const [state, formAction, pending] = useActionState(
    async (prev: MemberFormState & { sent: number }, formData: FormData) => {
      const next = await addMember(prev, formData);
      return { ...next, sent: prev.sent + (next.ok ? 1 : 0) };
    },
    { sent: 0 },
  );
  const emailErrors = state.fieldErrors?.email;

  return (
    <form
      key={state.sent}
      action={formAction}
      noValidate
      className="flex flex-col gap-3 rounded-lg border p-4"
    >
      <h3 className="text-sm font-semibold">Añadir miembro</h3>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="new-member-email" className="text-sm font-medium">
            Correo de Google
          </label>
          <input
            id="new-member-email"
            name="email"
            type="email"
            autoComplete="off"
            placeholder="nombre@example.com"
            defaultValue={state.values?.email ?? ""}
            aria-invalid={!!emailErrors}
            aria-describedby={emailErrors ? "new-member-email-error" : undefined}
            className={fieldClass}
          />
          <FieldErrors id="new-member-email-error" errors={emailErrors} />
        </div>
        <NameAndAreaFields idPrefix="new-member" values={state.values} fieldErrors={state.fieldErrors} />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Añadiendo…" : "Añadir"}
        </Button>
        {state.ok && (
          <p role="status" className="text-sm">
            Miembro añadido.
          </p>
        )}
        {state.message && (
          <p role="alert" className="text-sm text-destructive">
            {state.message}
          </p>
        )}
      </div>
    </form>
  );
}
