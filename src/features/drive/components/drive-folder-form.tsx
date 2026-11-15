"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { saveDriveFolder, type DriveFolderFormState } from "@/features/settings/actions";

const fieldClass =
  "min-w-0 flex-1 rounded-lg border border-input bg-background px-3 py-1.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

const INITIAL: DriveFolderFormState = { status: "idle" };

// Accepts a Drive folder URL or a bare id; the server action validates it.
export function DriveFolderForm() {
  const [state, formAction, pending] = useActionState(saveDriveFolder, INITIAL);
  return (
    <form action={formAction} className="flex flex-col gap-1.5">
      <label htmlFor="drive-folder" className="text-xs text-muted-foreground">
        Enlace o identificador de la carpeta
      </label>
      <div className="flex flex-wrap gap-2">
        <input
          id="drive-folder"
          name="folder"
          required
          autoComplete="off"
          placeholder="https://drive.google.com/drive/folders/…"
          className={fieldClass}
        />
        <Button type="submit" disabled={pending}>
          {pending ? "Guardando…" : "Guardar"}
        </Button>
      </div>
      {state.message && (
        <p
          role={state.status === "error" ? "alert" : "status"}
          className={`text-sm ${state.status === "error" ? "text-destructive" : "text-muted-foreground"}`}
        >
          {state.message}
        </p>
      )}
    </form>
  );
}
