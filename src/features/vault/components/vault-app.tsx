"use client";

import { useState } from "react";
import { Lock, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { VaultItem } from "../data";
import { ItemForm } from "./item-form";
import { ItemList } from "./item-list";
import {
  CreateVaultForm,
  FormError,
  LOSS_WARNING,
  PassphraseInput,
  UnlockForm,
  inputClass,
  newPassphraseError,
  usePassphraseForm,
} from "./vault-gate";
import { VaultProvider, useVault } from "./vault-provider";

export function VaultApp() {
  return (
    <VaultProvider>
      <VaultScreen />
    </VaultProvider>
  );
}

function VaultScreen() {
  const { status } = useVault();
  switch (status) {
    case "loading":
      return <p className="text-sm text-muted-foreground">Cargando…</p>;
    case "error":
      return (
        <p className="text-sm text-destructive" role="alert">
          No se pudo cargar la bóveda. Recarga la página.
        </p>
      );
    case "setup":
      return <CreateVaultForm />;
    case "locked":
      return <UnlockForm />;
    case "unlocked":
      return <UnlockedVault />;
  }
}

type Panel = { kind: "none" } | { kind: "add" } | { kind: "edit"; item: VaultItem } | { kind: "passphrase" };

function UnlockedVault() {
  const { items, lock } = useVault();
  const [query, setQuery] = useState("");
  const [panel, setPanel] = useState<Panel>({ kind: "none" });
  const close = () => setPanel({ kind: "none" });
  const needle = query.trim().toLocaleLowerCase("es");
  const visible = needle
    ? items.filter((item) => item.label.toLocaleLowerCase("es").includes(needle))
    : items;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => setPanel({ kind: "add" })}>
          <Plus /> Añadir
        </Button>
        <Button variant="outline" onClick={lock}>
          <Lock /> Bloquear
        </Button>
        <Button variant="ghost" onClick={() => setPanel({ kind: "passphrase" })}>
          Cambiar contraseña de la bóveda
        </Button>
      </div>

      {panel.kind === "add" && <ItemForm onDone={close} />}
      {panel.kind === "edit" && <ItemForm key={panel.item.id} item={panel.item} onDone={close} />}
      {panel.kind === "passphrase" && <ChangePassphraseForm onDone={close} />}

      <input
        type="search"
        aria-label="Buscar por nombre"
        placeholder="Buscar por nombre…"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        className={`${inputClass} max-w-sm`}
      />
      <ItemList items={visible} onEdit={(item) => setPanel({ kind: "edit", item })} />
    </div>
  );
}

// Re-encrypts every item under a new passphrase and salt (rotate_vault).
function ChangePassphraseForm({ onDone }: { onDone: () => void }) {
  const { changePassphrase } = useVault();
  const { error, pending, onSubmit } = usePassphraseForm(async (form) => {
    const next = String(form.get("new-passphrase") ?? "");
    const problem = newPassphraseError(next, String(form.get("new-confirmation") ?? ""));
    if (problem) return problem;
    await changePassphrase(String(form.get("current-passphrase") ?? ""), next);
    onDone();
  });

  return (
    <form onSubmit={onSubmit} className="flex max-w-md flex-col gap-4 rounded-lg border p-4" noValidate>
      <h2 className="text-lg font-semibold">Cambiar contraseña de la bóveda</h2>
      <p className="text-sm text-muted-foreground">
        Se vuelven a cifrar todos los elementos en tu navegador. Comparte la nueva contraseña con
        el resto del equipo por un canal seguro. {LOSS_WARNING}
      </p>
      <PassphraseInput id="current-passphrase" label="Contraseña actual" autoComplete="current-password" />
      <PassphraseInput id="new-passphrase" label="Nueva contraseña" autoComplete="new-password" />
      <PassphraseInput id="new-confirmation" label="Repite la nueva contraseña" autoComplete="new-password" />
      <FormError error={error} />
      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Cifrando…" : "Cambiar contraseña"}
        </Button>
        <Button type="button" variant="outline" onClick={onDone} disabled={pending}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
