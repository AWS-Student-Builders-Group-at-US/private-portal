"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { createSuggestion } from "../actions";
import type { SuggestionFormState } from "../types";

export function SuggestionForm() {
  // `sent` counts successful submits; it keys the form so the fields clear.
  const [state, formAction, pending] = useActionState(
    async (prev: SuggestionFormState & { sent: number }, formData: FormData) => {
      const next = await createSuggestion(prev, formData);
      return { ...next, sent: prev.sent + (next.ok ? 1 : 0) };
    },
    { sent: 0 },
  );
  const errors = state.fieldErrors?.body;

  return (
    <form
      key={state.sent}
      action={formAction}
      noValidate
      className="flex max-w-xl flex-col gap-3"
    >
      <label htmlFor="body" className="text-sm font-medium">
        Nueva sugerencia
      </label>
      <textarea
        id="body"
        name="body"
        rows={3}
        maxLength={2000}
        defaultValue={state.values?.body ?? ""}
        aria-invalid={!!errors}
        aria-describedby={errors ? "body-error" : undefined}
        placeholder="¿Qué mejorarías del grupo, de los eventos o del panel?"
        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive"
      />
      {errors?.map((error) => (
        <p key={error} id="body-error" className="text-sm text-destructive">
          {error}
        </p>
      ))}
      <p className="text-xs text-muted-foreground">
        Las sugerencias se publican con tu nombre.
      </p>
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Enviando…" : "Enviar"}
        </Button>
        {state.ok && (
          <p role="status" className="text-sm">
            Sugerencia enviada.
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
