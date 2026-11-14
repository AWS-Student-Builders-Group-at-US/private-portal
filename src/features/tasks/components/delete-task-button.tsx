"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { deleteTask } from "../actions";

// Two-step delete: the first click asks for confirmation in the page.
export function DeleteTaskButton({ taskId }: { taskId: string }) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function remove() {
    setError(null);
    startTransition(async () => {
      // On success the action redirects to the board.
      const result = await deleteTask(taskId);
      if (!result.ok) setError(result.message);
    });
  }

  if (!confirming) {
    return (
      <Button variant="destructive" onClick={() => setConfirming(true)}>
        Eliminar tarea
      </Button>
    );
  }

  return (
    <div className="flex max-w-xl flex-col gap-3 rounded-lg border border-destructive/40 p-4">
      <p className="text-sm">¿Eliminar esta tarea? Esta acción no se puede deshacer.</p>
      <div className="flex gap-2">
        <Button variant="destructive" onClick={remove} disabled={pending}>
          {pending ? "Eliminando…" : "Sí, eliminar"}
        </Button>
        <Button
          variant="outline"
          onClick={() => setConfirming(false)}
          disabled={pending}
        >
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
