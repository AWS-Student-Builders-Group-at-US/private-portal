"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { CheckinFormState } from "../types";

const fieldClass =
  "w-full rounded-lg border border-input bg-background px-3 py-2 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive";

type Props = {
  action: (state: CheckinFormState, formData: FormData) => Promise<CheckinFormState>;
};

function Errors({ id, errors }: { id: string; errors?: string[] }) {
  return errors?.map((error) => (
    <p key={error} id={id} className="text-sm text-destructive">
      {error}
    </p>
  ));
}

export function CheckinForm({ action }: Props) {
  const [state, formAction, pending] = useActionState(action, {});

  if (state.status === "success") {
    return (
      <p role="status" className="rounded-lg border bg-muted p-4 text-center">
        {state.message ?? "¡Asistencia registrada! Gracias por venir."}
      </p>
    );
  }

  const errors = state.fieldErrors ?? {};
  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="name" className="text-sm font-medium">
          Nombre
        </label>
        <input
          id="name"
          name="name"
          autoComplete="name"
          required
          minLength={2}
          maxLength={100}
          defaultValue={state.values?.name}
          aria-invalid={Boolean(errors.name)}
          aria-describedby={errors.name ? "name-error" : undefined}
          className={fieldClass}
        />
        <Errors id="name-error" errors={errors.name} />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="text-sm font-medium">
          Correo electrónico
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          required
          maxLength={254}
          defaultValue={state.values?.email}
          aria-invalid={Boolean(errors.email)}
          aria-describedby={errors.email ? "email-error" : undefined}
          className={fieldClass}
        />
        <Errors id="email-error" errors={errors.email} />
      </div>
      <label className="flex items-start gap-3 text-sm">
        <input
          type="checkbox"
          name="photo_consent"
          defaultChecked={state.values?.photo_consent === "on"}
          className="mt-0.5 size-5 shrink-0"
        />
        Acepto aparecer en fotos y vídeos del evento
      </label>
      <label className="flex items-start gap-3 text-sm">
        <input
          type="checkbox"
          name="email_consent"
          defaultChecked={state.values?.email_consent === "on"}
          className="mt-0.5 size-5 shrink-0"
        />
        Quiero recibir correos sobre próximos eventos
      </label>
      <p className="text-sm text-muted-foreground">
        Consulta cómo tratamos tus datos en la{" "}
        <Link href="/privacidad" className="underline underline-offset-4">
          política de privacidad
        </Link>
        .
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
