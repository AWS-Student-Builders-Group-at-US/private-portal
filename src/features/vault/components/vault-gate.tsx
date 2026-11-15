"use client";

import { useState } from "react";
import { KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { errorMessage } from "../data";
import { MIN_PASSPHRASE, newPassphraseError } from "../rotation";
import { NO_AUTOFILL_FORM, PassphraseField } from "./secret-input";
import { useVault } from "./vault-provider";

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

// Shown as the only content of /panel/boveda while vault_meta has no row:
// nothing can be stored until the shared passphrase exists.
export function CreateVaultForm() {
  const { create } = useVault();
  const { error, pending, onSubmit } = usePassphraseForm(async (form) => {
    const passphrase = String(form.get("vk-create") ?? "");
    const problem = newPassphraseError(passphrase, String(form.get("vk-create-repeat") ?? ""));
    if (problem) return problem;
    await create(passphrase);
  });

  return (
    <section
      aria-labelledby="crear-boveda"
      className="flex max-w-xl flex-col gap-4 rounded-lg border-2 border-primary/40 p-5"
    >
      <div className="flex items-center gap-2">
        <KeyRound className="size-5" aria-hidden />
        <h2 id="crear-boveda" className="text-xl font-semibold">
          Crear la bóveda
        </h2>
      </div>
      <p className="text-sm">
        La bóveda todavía no tiene contraseña. Antes de guardar ningún dato hay que crearla.
      </p>
      <ul className="flex list-disc flex-col gap-1 pl-5 text-sm text-muted-foreground">
        <li>
          Es una contraseña <strong>compartida por todo el equipo</strong>: compártela con el
          resto por un canal seguro.
        </li>
        <li>
          Cifra los datos en tu navegador y nunca se envía al servidor, por lo que{" "}
          <strong>no se puede recuperar</strong>.
        </li>
        <li>Guárdala en tu gestor de contraseñas personal.</li>
        <li>Debe tener al menos {MIN_PASSPHRASE} caracteres.</li>
      </ul>
      <p
        role="note"
        className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-2 text-sm"
      >
        {LOSS_WARNING}
      </p>
      <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate {...NO_AUTOFILL_FORM}>
        <PassphraseField id="vk-create" label="Contraseña de la bóveda" />
        <PassphraseField id="vk-create-repeat" label="Repite la contraseña" />
        <FormError error={error} />
        <Button type="submit" disabled={pending} className="self-start">
          {pending ? "Creando…" : "Crear la bóveda"}
        </Button>
      </form>
    </section>
  );
}

export function UnlockForm() {
  const { unlock } = useVault();
  const { error, pending, onSubmit } = usePassphraseForm((form) =>
    unlock(String(form.get("vk-unlock") ?? "")),
  );

  return (
    <form
      onSubmit={onSubmit}
      className="flex max-w-md flex-col gap-4"
      noValidate
      {...NO_AUTOFILL_FORM}
    >
      <h2 className="text-lg font-semibold">Bóveda bloqueada</h2>
      <PassphraseField id="vk-unlock" label="Contraseña de la bóveda" />
      <FormError error={error} />
      <Button type="submit" disabled={pending} className="self-start">
        {pending ? "Desbloqueando…" : "Desbloquear"}
      </Button>
    </form>
  );
}
