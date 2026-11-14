"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { sendCampaignChunk, startCampaign } from "../actions";

// Client loop over server-action chunks (each sends at most 25 emails, to fit
// the function time limit). Stopping midway is safe: resume skips anyone with
// a delivery row.
function useCampaignSender() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(start: () => Promise<{ ok: true; campaignId: string } | { ok: false; message: string }>) {
    setBusy(true);
    setError(null);
    try {
      const started = await start();
      if (!started.ok) return setError(started.message);
      for (;;) {
        const result = await sendCampaignChunk(started.campaignId);
        if (!result.ok) return setError(result.message);
        setProgress(
          `Enviados ${result.processed} de ${result.total}` +
            (result.failed ? ` (${result.failed} con error)` : ""),
        );
        if (result.done) return;
      }
    } catch {
      setError("Se interrumpió el envío. Puedes continuarlo desde la lista de envíos.");
    } finally {
      setBusy(false);
      router.refresh();
    }
  }
  return { run, busy, progress, error };
}

const fieldClass =
  "w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function EmailComposer({
  eventId,
  recipientCount,
  defaults,
}: {
  eventId: string;
  recipientCount: number;
  defaults: { subject: string; body: string };
}) {
  const [subject, setSubject] = useState(defaults.subject);
  const [body, setBody] = useState(defaults.body);
  const [step, setStep] = useState<"edit" | "preview" | "confirm">("edit");
  const { run, busy, progress, error } = useCampaignSender();

  return (
    <div className="flex flex-col gap-3">
      <label className="flex flex-col gap-1 text-sm font-medium">
        Asunto
        <input
          className={fieldClass}
          value={subject}
          maxLength={150}
          disabled={busy}
          onChange={(e) => setSubject(e.target.value)}
        />
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium">
        Mensaje
        <textarea
          className={`${fieldClass} min-h-48`}
          value={body}
          maxLength={5000}
          disabled={busy}
          onChange={(e) => setBody(e.target.value)}
        />
      </label>

      {step !== "edit" && (
        <div className="flex flex-col gap-2 rounded-lg bg-muted p-3 text-sm">
          <p className="font-medium">{subject}</p>
          <p className="whitespace-pre-line">{body}</p>
          <p className="border-t pt-2 text-xs text-muted-foreground">
            Pie añadido automáticamente: por qué recibe el correo y enlace para darse de baja.
          </p>
        </div>
      )}

      {step === "confirm" ? (
        <div className="flex flex-col gap-2 rounded-lg border border-destructive/40 p-3">
          <p className="text-sm">
            Se enviará este correo a {recipientCount}{" "}
            {recipientCount === 1 ? "persona" : "personas"}. No se puede deshacer. ¿Continuar?
          </p>
          <div className="flex gap-2">
            <Button
              size="sm"
              disabled={busy}
              onClick={() =>
                run(() => startCampaign(eventId, { subject, body })).then(() => setStep("edit"))
              }
            >
              Sí, enviar
            </Button>
            <Button size="sm" variant="outline" disabled={busy} onClick={() => setStep("edit")}>
              Cancelar
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setStep(step === "preview" ? "edit" : "preview")}
          >
            {step === "preview" ? "Ocultar vista previa" : "Vista previa"}
          </Button>
          <Button size="sm" disabled={recipientCount === 0} onClick={() => setStep("confirm")}>
            Enviar
          </Button>
        </div>
      )}
      {progress && <p role="status" className="text-sm">{progress}</p>}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

export function ResumeCampaignButton({ campaignId }: { campaignId: string }) {
  const { run, busy, progress, error } = useCampaignSender();
  return (
    <div className="flex flex-col items-start gap-1">
      <Button
        variant="outline"
        size="sm"
        disabled={busy}
        onClick={() => run(async () => ({ ok: true, campaignId }))}
      >
        Continuar envío
      </Button>
      {progress && <p role="status" className="text-sm">{progress}</p>}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
