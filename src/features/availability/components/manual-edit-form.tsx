"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { editMyAvailability } from "../actions";
import { formatNoteRange, type NoteRect } from "../notes";
import { occupationColor } from "../occupation";
import type { ManualChoice } from "../schema";

const CHOICES: { choice: Exclude<ManualChoice, "google">; label: string; value: number }[] = [
  { choice: "0", label: "Libre", value: 0 },
  { choice: "0.5", label: "Lo podría mover", value: 0.5 },
  { choice: "1", label: "No lo puedo mover", value: 1 },
];

// Choices for a hand edit of the selected rectangle of the member's week. The
// edit applies to those dates only and replaces Google there; "Usar Google"
// removes the edits.
export function ManualEditForm({ rect, onDone }: { rect: NoteRect; onDone: () => void }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function save(choice: ManualChoice) {
    setMessage(null);
    startTransition(async () => {
      const result = await editMyAvailability({ ...rect, choice });
      if (result.ok) onDone();
      else setMessage(result.message);
    });
  }

  return (
    <div className="flex max-w-xl flex-col gap-3">
      <p className="text-sm">
        <span className="text-muted-foreground">Franja: </span>
        <span className="font-medium">{formatNoteRange(rect)}</span>
      </p>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Disponibilidad">
        {CHOICES.map((item) => (
          <Button
            key={item.choice}
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={() => save(item.choice)}
          >
            <span
              aria-hidden
              className="size-3 rounded-[3px]"
              style={{ backgroundColor: occupationColor(item.value, 1) }}
            />
            {item.label}
          </Button>
        ))}
        <Button variant="ghost" size="sm" disabled={pending} onClick={() => save("google")}>
          Usar Google
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        El cambio vale solo para estos días y manda sobre tus calendarios de Google. «Usar
        Google» quita lo editado a mano en esta franja.
      </p>
      {message && (
        <p className="text-sm text-destructive" role="alert">
          {message}
        </p>
      )}
    </div>
  );
}
