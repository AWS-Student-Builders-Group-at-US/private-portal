"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { errorMessage, type VaultItem } from "../data";
import { MAX_CUSTOM_FIELDS, vaultItemFormSchema } from "../schema";
import { NO_AUTOFILL, NO_AUTOFILL_FORM, SecretInput, inputClass } from "./secret-input";
import { FormError } from "./vault-gate";
import { useVault } from "./vault-provider";

// Input names deliberately avoid "user", "pass", "login" and "email" so
// browsers and password managers do not autofill them (see secret-input.tsx).
// They are mapped back to the schema keys on submit.
const TEXT_FIELDS = [
  { name: "item-title", key: "label", label: "Nombre", type: "text" },
  { name: "item-group", key: "category", label: "Categoría (opcional)", type: "text" },
  { name: "item-account", key: "username", label: "Usuario", type: "text" },
] as const;

type DraftField = { uid: string; name: string; value: string; secret: boolean };

const GOOGLE_OAUTH: Omit<DraftField, "uid">[] = [
  { name: "Client ID", value: "", secret: false },
  { name: "Client secret", value: "", secret: true },
  { name: "Proyecto", value: "", secret: false },
  { name: "URI de redirección", value: "", secret: false },
];

const newUid = () => crypto.randomUUID();

// Add (no item) or edit (item) form. Values are encrypted before saving.
export function ItemForm({ item, onDone }: { item?: VaultItem; onDone: () => void }) {
  const { save } = useVault();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [fields, setFields] = useState<DraftField[]>(() =>
    (item?.payload?.fields ?? []).map((field) => ({ uid: newUid(), ...field })),
  );
  const defaults: Record<string, string> = {
    label: item?.label ?? "",
    category: item?.category ?? "",
    username: item?.payload?.username ?? "",
    password: item?.payload?.password ?? "",
    url: item?.payload?.url ?? "",
    notes: item?.payload?.notes ?? "",
  };

  const update = (uid: string, patch: Partial<DraftField>) =>
    setFields((list) => list.map((field) => (field.uid === uid ? { ...field, ...patch } : field)));
  const move = (index: number, offset: -1 | 1) =>
    setFields((list) => {
      const next = [...list];
      [next[index], next[index + offset]] = [next[index + offset], next[index]];
      return next;
    });
  const addFields = (added: Omit<DraftField, "uid">[]) =>
    setFields((list) =>
      [...list, ...added.map((field) => ({ uid: newUid(), ...field }))].slice(0, MAX_CUSTOM_FIELDS),
    );

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const get = (name: string) => String(form.get(name) ?? "");
    const parsed = vaultItemFormSchema.safeParse({
      label: get("item-title"),
      category: get("item-group"),
      username: get("item-account"),
      password: get("item-secret"),
      url: get("item-link"),
      notes: get("item-memo"),
      fields: fields.map(({ name, value, secret }) => ({ name, value, secret })),
    });
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
      {...NO_AUTOFILL_FORM}
    >
      <h2 className="text-lg font-semibold">{item ? "Editar elemento" : "Añadir elemento"}</h2>
      <p className="text-xs text-muted-foreground">
        El nombre y la categoría se guardan sin cifrar; el resto se cifra en tu navegador.
      </p>
      {TEXT_FIELDS.map((field) => (
        <div key={field.name} className="flex flex-col gap-1.5">
          <label htmlFor={field.name} className="text-sm font-medium">
            {field.label}
          </label>
          <input
            id={field.name}
            name={field.name}
            type={field.type}
            defaultValue={defaults[field.key]}
            className={inputClass}
            {...NO_AUTOFILL}
          />
        </div>
      ))}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="item-secret" className="text-sm font-medium">
          Contraseña
        </label>
        <SecretInput id="item-secret" name="item-secret" defaultValue={defaults.password} />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="item-link" className="text-sm font-medium">
          URL
        </label>
        <input
          id="item-link"
          name="item-link"
          type="url"
          defaultValue={defaults.url}
          className={inputClass}
          {...NO_AUTOFILL}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="item-memo" className="text-sm font-medium">
          Notas
        </label>
        <textarea
          id="item-memo"
          name="item-memo"
          rows={3}
          defaultValue={defaults.notes}
          className={inputClass}
          {...NO_AUTOFILL}
        />
      </div>

      <fieldset className="flex flex-col gap-3 rounded-lg border p-3">
        <legend className="px-1 text-sm font-medium">Campos adicionales</legend>
        <p className="text-xs text-muted-foreground">
          Por ejemplo, para Google OAuth: client ID, client secret, proyecto y URI de
          redirección. Marca como secretos los valores que deban ocultarse.
        </p>
        {fields.map((field, index) => (
          <div key={field.uid} className="flex flex-col gap-2 rounded-lg bg-muted/40 p-3">
            <div className="flex flex-col gap-1.5">
              <label htmlFor={`cf-name-${field.uid}`} className="text-xs font-medium">
                Nombre del campo
              </label>
              <input
                id={`cf-name-${field.uid}`}
                value={field.name}
                onChange={(event) => update(field.uid, { name: event.target.value })}
                maxLength={60}
                className={inputClass}
                {...NO_AUTOFILL}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor={`cf-value-${field.uid}`} className="text-xs font-medium">
                Valor
              </label>
              {field.secret ? (
                <SecretInput
                  id={`cf-value-${field.uid}`}
                  value={field.value}
                  onChange={(event) => update(field.uid, { value: event.target.value })}
                  maxLength={5000}
                />
              ) : (
                <input
                  id={`cf-value-${field.uid}`}
                  value={field.value}
                  onChange={(event) => update(field.uid, { value: event.target.value })}
                  maxLength={5000}
                  className={inputClass}
                  {...NO_AUTOFILL}
                />
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <label className="mr-auto flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={field.secret}
                  onChange={(event) => update(field.uid, { secret: event.target.checked })}
                />
                Secreto
              </label>
              <Button
                type="button"
                size="icon-sm"
                variant="outline"
                aria-label="Subir campo"
                disabled={index === 0}
                onClick={() => move(index, -1)}
              >
                <ArrowUp />
              </Button>
              <Button
                type="button"
                size="icon-sm"
                variant="outline"
                aria-label="Bajar campo"
                disabled={index === fields.length - 1}
                onClick={() => move(index, 1)}
              >
                <ArrowDown />
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setFields((list) => list.filter((f) => f.uid !== field.uid))}
              >
                <Trash2 /> Quitar
              </Button>
            </div>
          </div>
        ))}
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={fields.length >= MAX_CUSTOM_FIELDS}
            onClick={() => addFields([{ name: "", value: "", secret: false }])}
          >
            <Plus /> Añadir campo
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={fields.length + GOOGLE_OAUTH.length > MAX_CUSTOM_FIELDS}
            onClick={() => addFields(GOOGLE_OAUTH)}
          >
            <Plus /> Campos de Google OAuth
          </Button>
        </div>
        {fields.length >= MAX_CUSTOM_FIELDS && (
          <p className="text-xs text-muted-foreground">
            Se admiten como máximo {MAX_CUSTOM_FIELDS} campos adicionales.
          </p>
        )}
      </fieldset>

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
