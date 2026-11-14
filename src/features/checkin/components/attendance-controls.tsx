"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import type { ActionResult } from "@/features/events/types";
import {
  deleteAttendee,
  regenerateCheckinToken,
  setCheckinOpen,
} from "../panel-actions";

// Small client controls for the attendance section of the event page.

function useAction() {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  function run(action: () => Promise<ActionResult>, onDone?: () => void) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) setError(result.message);
      else onDone?.();
    });
  }
  const errorText = error && (
    <p className="text-sm text-destructive" role="alert">
      {error}
    </p>
  );
  return { run, pending, errorText };
}

export function CheckinToggle({ eventId, open }: { eventId: string; open: boolean }) {
  const { run, pending, errorText } = useAction();
  return (
    <div className="flex flex-col gap-2">
      <Button
        variant={open ? "outline" : "default"}
        disabled={pending}
        onClick={() => run(() => setCheckinOpen(eventId, !open))}
      >
        {open ? "Cerrar registro" : "Abrir registro"}
      </Button>
      {errorText}
    </div>
  );
}

export function CopyUrlButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }
  return (
    <Button variant="outline" size="sm" onClick={copy}>
      {copied ? "Copiado" : "Copiar enlace"}
    </Button>
  );
}

function ConfirmAction({
  label,
  question,
  confirmLabel,
  action,
}: {
  label: string;
  question: string;
  confirmLabel: string;
  action: () => Promise<ActionResult>;
}) {
  const [confirming, setConfirming] = useState(false);
  const { run, pending, errorText } = useAction();

  if (!confirming) {
    return (
      <div className="flex flex-col gap-2">
        <Button variant="outline" size="sm" onClick={() => setConfirming(true)}>
          {label}
        </Button>
        {errorText}
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-destructive/40 p-3">
      <p className="text-sm">{question}</p>
      <div className="flex gap-2">
        <Button
          variant="destructive"
          size="sm"
          disabled={pending}
          onClick={() => run(action, () => setConfirming(false))}
        >
          {confirmLabel}
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={() => setConfirming(false)}
        >
          Cancelar
        </Button>
      </div>
      {errorText}
    </div>
  );
}

export function RegenerateQrButton({ eventId }: { eventId: string }) {
  return (
    <ConfirmAction
      label="Regenerar QR"
      question="El QR y el enlace actuales dejarán de funcionar. ¿Continuar?"
      confirmLabel="Sí, regenerar"
      action={() => regenerateCheckinToken(eventId)}
    />
  );
}

export function DeleteAttendeeButton({
  attendeeId,
  name,
}: {
  attendeeId: string;
  name: string;
}) {
  return (
    <ConfirmAction
      label="Eliminar"
      question={`¿Eliminar el registro de «${name}»? No se puede deshacer.`}
      confirmLabel="Sí, eliminar"
      action={() => deleteAttendee(attendeeId)}
    />
  );
}
