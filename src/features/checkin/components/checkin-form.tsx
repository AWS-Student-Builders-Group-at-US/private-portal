"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FormFields } from "@/features/checkin-forms/components/form-fields";
import type { PublicCheckinForm } from "@/features/checkin-forms/types";
import type { CheckinFormState } from "../types";

type Props = {
  form: PublicCheckinForm;
  action: (state: CheckinFormState, formData: FormData) => Promise<CheckinFormState>;
};

export function CheckinForm({ form: initialForm, action }: Props) {
  const [state, formAction, pending] = useActionState(action, {});
  // The server sends the new active version when it changed since render.
  const form = state.form ?? initialForm;

  if (state.status === "success") {
    return (
      <p role="status" className="rounded-lg border bg-muted p-4 text-center">
        {state.message ?? "¡Asistencia registrada! Gracias por venir."}
      </p>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-medium">{form.title}</h2>
        {form.intro && (
          <p className="whitespace-pre-line text-sm text-muted-foreground">{form.intro}</p>
        )}
      </div>
      <input type="hidden" name="form_version_id" value={form.id} />
      <FormFields
        key={form.id}
        fields={form.fields}
        values={state.values}
        errors={state.fieldErrors}
      />
      <p className="text-sm text-muted-foreground">
        Consulta cómo tratamos tus datos en la{" "}
        <Link href="/privacidad" className="underline underline-offset-4">
          política de privacidad
        </Link>{" "}
        (versión {form.version}).
      </p>
      {state.message && (
        <p role="alert" className="text-sm text-destructive">
          {state.message}
        </p>
      )}
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Registrando…" : "Registrar asistencia"}
      </Button>
    </form>
  );
}
