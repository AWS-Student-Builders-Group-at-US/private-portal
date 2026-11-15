"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NO_AUTOFILL_FORM, PassphraseField } from "@/features/vault/components/secret-input";
import { FormError, LOSS_WARNING, usePassphraseForm } from "@/features/vault/components/vault-gate";
import { changeVaultPassphrase, fetchMeta } from "@/features/vault/data";
import { MIN_PASSPHRASE } from "@/features/vault/rotation";

type Status = "loading" | "error" | "missing" | "ready";

// Changes the shared vault passphrase. Everything happens in the browser:
// the current passphrase is checked against the stored verifier, then every
// item is re-encrypted under the new one and saved atomically (rotate_vault).
export function VaultPasswordSettings() {
  const [status, setStatus] = useState<Status>("loading");

  useEffect(() => {
    let active = true;
    fetchMeta()
      .then((meta) => active && setStatus(meta ? "ready" : "missing"))
      .catch(() => active && setStatus("error"));
    return () => {
      active = false;
    };
  }, []);

  return (
    <section aria-labelledby="boveda" className="flex flex-col gap-3 rounded-lg border p-4">
      <h2 id="boveda" className="text-lg font-semibold">
        Bóveda
      </h2>
      {status === "loading" && <p className="text-sm text-muted-foreground">Cargando…</p>}
      {status === "error" && (
        <p className="text-sm text-destructive" role="alert">
          No se pudo cargar la bóveda. Recarga la página.
        </p>
      )}
      {status === "missing" && (
        <>
          <p className="text-sm text-muted-foreground">
            La bóveda todavía no tiene contraseña. Créala antes de guardar datos.
          </p>
          <Link
            href="/panel/boveda"
            className="flex w-fit items-center gap-1 text-sm font-medium underline-offset-4 hover:underline"
          >
            Crear la bóveda
            <ChevronRight className="size-4" />
          </Link>
        </>
      )}
      {status === "ready" && <ChangeVaultPassphraseForm />}
    </section>
  );
}

function ChangeVaultPassphraseForm() {
  const [done, setDone] = useState(false);
  const { error, pending, onSubmit } = usePassphraseForm(async (form) => {
    setDone(false);
    await changeVaultPassphrase({
      current: String(form.get("vk-current") ?? ""),
      next: String(form.get("vk-next") ?? ""),
      confirmation: String(form.get("vk-next-repeat") ?? ""),
    });
    setDone(true);
  });

  return (
    <form
      onSubmit={onSubmit}
      className="flex max-w-md flex-col gap-4"
      noValidate
      {...NO_AUTOFILL_FORM}
    >
      <p className="text-sm font-medium">Cambiar la contraseña de la bóveda</p>
      <p className="text-sm text-muted-foreground">
        Hace falta la contraseña actual. Todos los elementos se vuelven a cifrar en tu navegador
        con la nueva (mínimo {MIN_PASSPHRASE} caracteres). Comparte la nueva contraseña con el
        resto del equipo por un canal seguro. {LOSS_WARNING}
      </p>
      <PassphraseField id="vk-current" label="Contraseña actual" />
      <PassphraseField id="vk-next" label="Nueva contraseña" />
      <PassphraseField id="vk-next-repeat" label="Repite la nueva contraseña" />
      <FormError error={error} />
      {done && !error && (
        <p className="text-sm" role="status">
          Contraseña cambiada. La bóveda abierta en otras pestañas se ha bloqueado; a partir de
          ahora todo el equipo debe desbloquearla con la nueva contraseña.
        </p>
      )}
      <Button type="submit" disabled={pending} className="self-start">
        {pending ? "Cifrando de nuevo…" : "Cambiar contraseña"}
      </Button>
    </form>
  );
}
