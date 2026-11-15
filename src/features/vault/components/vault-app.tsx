"use client";

import { useState } from "react";
import Link from "next/link";
import { KeyRound, Lock, Plus } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import type { VaultItem } from "../data";
import { ItemForm } from "./item-form";
import { ItemList } from "./item-list";
import { NO_AUTOFILL, inputClass } from "./secret-input";
import { CreateVaultForm, UnlockForm } from "./vault-gate";
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

type Panel = { kind: "none" } | { kind: "add" } | { kind: "edit"; item: VaultItem };

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
        <Link href="/panel/ajustes#boveda" className={buttonVariants({ variant: "ghost" })}>
          <KeyRound /> Cambiar contraseña de la bóveda
        </Link>
      </div>

      {panel.kind === "add" && <ItemForm onDone={close} />}
      {panel.kind === "edit" && <ItemForm key={panel.item.id} item={panel.item} onDone={close} />}

      <input
        type="search"
        {...NO_AUTOFILL}
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
