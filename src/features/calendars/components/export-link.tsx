"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { regenerateExportToken } from "../actions";

export function ExportLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("No se pudo copiar. Selecciona el enlace y cópialo a mano.");
    }
  }

  function regenerate() {
    setError(null);
    startTransition(async () => {
      const result = await regenerateExportToken();
      if (result.ok) setConfirming(false);
      else setError(result.message);
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          readOnly
          value={url}
          aria-label="Enlace de suscripción"
          onFocus={(e) => e.currentTarget.select()}
          className="w-full rounded-lg border border-input bg-muted px-3 py-2 font-mono text-xs"
        />
        <Button variant="outline" onClick={copy}>
          {copied ? "Copiado" : "Copiar"}
        </Button>
      </div>
      {!confirming ? (
        <div>
          <Button variant="ghost" size="sm" onClick={() => setConfirming(true)}>
            Regenerar enlace
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-3 rounded-lg border border-destructive/40 p-4">
          <p className="text-sm">
            El enlace actual dejará de funcionar y tendrás que volver a suscribirte en
            Google Calendar. ¿Continuar?
          </p>
          <div className="flex gap-2">
            <Button variant="destructive" onClick={regenerate} disabled={pending}>
              {pending ? "Regenerando…" : "Sí, regenerar"}
            </Button>
            <Button variant="outline" onClick={() => setConfirming(false)} disabled={pending}>
              Cancelar
            </Button>
          </div>
        </div>
      )}
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
