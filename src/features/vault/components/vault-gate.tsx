"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { errorMessage } from "../data";
import { useVault } from "./vault-provider";

export const MIN_PASSPHRASE = 12;

export const inputClass =
  "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export function PassphraseInput({
  id,
  label,
  autoComplete,
}: {
  id: string;
  label: string;
  autoComplete: "current-password" | "new-password";
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <input
        id={id}
        name={id}
        type="password"
        required
        autoComplete={autoComplete}
        className={inputClass}
      />
    </div>
  );
}

/** Returns an error for a new passphrase + confirmation, or null. */
export function newPassphraseError(passphrase: string, confirmation: string) {
  if (passphrase.length < MIN_PASSPHRASE) {
    return `La contraseña debe tener al menos ${MIN_PASSPHRASE} caracteres.`;
  }
  if (passphrase !== confirmation) return "Las contraseñas no coinciden.";
  return null;
}

export const LOSS_WARNING =
  "Si se pierde la contraseña de la bóveda, los datos no se pueden recuperar: nadie, ni siquiera un administrador de la base de datos, puede descifrarlos.";

// Handles a passphrase form submit: runs `action` and shows Spanish errors.
export function usePassphraseForm(action: (form: FormData) => Promise<string | null | void>) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setError(null);
    setPending(true);
    try {
      const problem = await action(new FormData(form));
      if (problem) setError(problem);
      else form.reset();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setPending(false);
    }
  }
  return { error, pending, onSubmit };
}

export function FormError({ error }: { error: string | null }) {
  if (!error) return null;
  return (
    <p className="text-sm text-destructive" role="alert">
      {error}
    </p>
  );
}

export function CreateVaultForm() {
  const { create } = useVault();
  const { error, pending, onSubmit } = usePassphraseForm(async (form) => {
    const passphrase = String(form.get("passphrase") ?? "");
    const problem = newPassphraseError(passphrase, String(form.get("confirmation") ?? ""));
    if (problem) return problem;
    await create(passphrase);
  });

  return (
    <form onSubmit={onSubmit} className="flex max-w-md flex-col gap-4" noValidate>
      <h2 className="text-lg font-semibold">Crear bóveda</h2>
      <p className="text-sm text-muted-foreground">
        Elige una contraseña compartida para el Core Team (mínimo {MIN_PASSPHRASE}{" "}
        caracteres). Se usa en tu navegador para cifrar los datos y nunca se envía al
        servidor.
      </p>
      <p
        role="note"
        className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-2 text-sm"
      >
        {LOSS_WARNING}
      </p>
      <PassphraseInput id="passphrase" label="Contraseña de la bóveda" autoComplete="new-password" />
      <PassphraseInput id="confirmation" label="Repite la contraseña" autoComplete="new-password" />
      <FormError error={error} />
      <Button type="submit" disabled={pending} className="self-start">
        {pending ? "Creando…" : "Crear bóveda"}
      </Button>
    </form>
  );
}

export function UnlockForm() {
  const { unlock } = useVault();
  const { error, pending, onSubmit } = usePassphraseForm((form) =>
    unlock(String(form.get("passphrase") ?? "")),
  );

  return (
    <form onSubmit={onSubmit} className="flex max-w-md flex-col gap-4" noValidate>
      <h2 className="text-lg font-semibold">Bóveda bloqueada</h2>
      <PassphraseInput id="passphrase" label="Contraseña de la bóveda" autoComplete="current-password" />
      <FormError error={error} />
      <Button type="submit" disabled={pending} className="self-start">
        {pending ? "Desbloqueando…" : "Desbloquear"}
      </Button>
    </form>
  );
}
