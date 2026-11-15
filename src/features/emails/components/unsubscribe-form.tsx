"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import type { UnsubscribeState } from "../unsubscribe-actions";

export function UnsubscribeForm({
  action,
}: {
  action: () => Promise<UnsubscribeState>;
}) {
  const [state, formAction, pending] = useActionState<UnsubscribeState>(action, {
    status: "idle",
  });

  if (state.status === "done") {
    return (
      <p role="status" className="rounded-lg border bg-muted p-4">
        Listo. Si el enlace es válido, no volverás a recibir correos del grupo.
      </p>
    );
  }
  return (
    <form action={formAction} className="flex flex-col gap-3">
      <p>¿Quieres dejar de recibir correos sobre nuestros eventos?</p>
      <Button type="submit" disabled={pending}>
        {pending ? "Procesando…" : "Confirmar baja"}
      </Button>
      {state.status === "error" && (
        <p role="alert" className="text-sm text-destructive">
          No se pudo procesar la solicitud. Inténtalo de nuevo más tarde.
        </p>
      )}
    </form>
  );
}
