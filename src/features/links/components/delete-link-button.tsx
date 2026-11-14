"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { deleteLink } from "../actions";

export function DeleteLinkButton({ linkId }: { linkId: string }) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!confirming) {
    return (
      <Button variant="destructive" className="self-start" onClick={() => setConfirming(true)}>
        Eliminar enlace
      </Button>
    );
  }
  return (
    <div className="flex max-w-xl flex-col gap-3 rounded-lg border border-destructive/40 p-4">
      <p className="text-sm">¿Eliminar este enlace?</p>
      <div className="flex gap-2">
        <Button
          variant="destructive"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const result = await deleteLink(linkId);
              if (!result.ok) setError(result.message);
            })
          }
        >
          {pending ? "Eliminando…" : "Sí, eliminar"}
        </Button>
        <Button variant="outline" disabled={pending} onClick={() => setConfirming(false)}>
          Cancelar
        </Button>
      </div>
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
