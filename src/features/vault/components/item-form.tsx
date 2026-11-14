"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { errorMessage, type VaultItem } from "../data";
import { vaultItemFormSchema } from "../schema";
import { FormError, inputClass } from "./vault-gate";
import { useVault } from "./vault-provider";

const FIELDS = [
  { name: "label", label: "Nombre", type: "text", autoComplete: "off" },
  { name: "category", label: "Categoría (opcional)", type: "text", autoComplete: "off" },
  { name: "username", label: "Usuario", type: "text", autoComplete: "off" },
  { name: "password", label: "Contraseña", type: "password", autoComplete: "new-password" },
  { name: "url", label: "URL", type: "url", autoComplete: "off" },
] as const;

// Add (no item) or edit (item) form. Values are encrypted before saving.
export function ItemForm({ item, onDone }: { item?: VaultItem; onDone: () => void }) {
  const { save } = useVault();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const defaults: Record<string, string> = {
    label: item?.label ?? "",
    category: item?.category ?? "",
    ...item?.payload,
  };

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = vaultItemFormSchema.safeParse(
      Object.fromEntries(new FormData(event.currentTarget)),
    );
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Revisa los campos.");
      return;
    }
    setError(null);
    setPending(true);
    try {
      await save({ id: item?.id, ...parsed.data });
      onDone();
    } catch (caught) {
      setError(errorMessage(caught));
      setPending(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="flex max-w-xl flex-col gap-4 rounded-lg border p-4"
      noValidate
    >
      <h2 className="text-lg font-semibold">{item ? "Editar elemento" : "Añadir elemento"}</h2>
      <p className="text-xs text-muted-foreground">
        El nombre y la categoría se guardan sin cifrar; el resto se cifra en tu navegador.
      </p>
      {FIELDS.map((field) => (
        <div key={field.name} className="flex flex-col gap-1.5">
          <label htmlFor={`item-${field.name}`} className="text-sm font-medium">
            {field.label}
          </label>
          <input
            id={`item-${field.name}`}
            name={field.name}
            type={field.type}
            autoComplete={field.autoComplete}
            defaultValue={defaults[field.name]}
            className={inputClass}
          />
        </div>
      ))}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="item-notes" className="text-sm font-medium">
          Notas
        </label>
        <textarea
          id="item-notes"
          name="notes"
          rows={3}
          defaultValue={defaults.notes}
          className={inputClass}
        />
      </div>
      <FormError error={error} />
      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Guardando…" : "Guardar"}
        </Button>
        <Button type="button" variant="outline" onClick={onDone} disabled={pending}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
