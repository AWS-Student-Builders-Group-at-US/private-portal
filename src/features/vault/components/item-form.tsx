"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, FileInput, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { errorMessage, type VaultItem } from "../data";
import { mergeEnvFields, parseEnv } from "../env";
import { MAX_CUSTOM_FIELDS, vaultItemFormSchema, type VaultItemKind } from "../schema";
import { NO_AUTOFILL, NO_AUTOFILL_FORM, SecretInput, inputClass } from "./secret-input";
import { FormError } from "./vault-gate";
import { useVault } from "./vault-provider";

// Input names deliberately avoid "user", "pass", "login" and "email" so
// browsers and password managers do not autofill them (see secret-input.tsx).
// They are mapped back to the schema keys on submit.
const TEXT_FIELDS = [
  { name: "item-title", key: "label", label: "Nombre", type: "text" },
  { name: "item-group", key: "category", label: "Categoría (opcional)", type: "text" },
] as const;

const KIND_OPTIONS: { value: VaultItemKind; label: string }[] = [
  { value: "account", label: "Cuenta" },
  { value: "secret", label: "Secret / API key" },
];

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
  const [kind, setKind] = useState<VaultItemKind>(item?.payload?.kind ?? "account");
  const [fields, setFields] = useState<DraftField[]>(() =>
    (item?.payload?.fields ?? []).map((field) => ({ uid: newUid(), ...field })),
  );
  const [envText, setEnvText] = useState<string | null>(null);
  const [envMessage, setEnvMessage] = useState<string | null>(null);
  const isSecret = kind === "secret";
  // Switching an existing account to a secret item discards these values on save.
  const dropsAccountValues =
    isSecret &&
    item?.payload?.kind === "account" &&
    Boolean(item.payload.username || item.payload.password || item.payload.url);
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

  // Imports pasted `.env` text into the fields (same names are overwritten).
  function importEnv() {
    const { entries, invalid } = parseEnv(envText ?? "");
    if (entries.length === 0) {
      setEnvMessage(
        invalid.length > 0
          ? `No se encontró ninguna variable válida (líneas ${invalid.join(", ")}).`
          : "Pega líneas con el formato NOMBRE=valor.",
      );
      return;
    }
    const merged = mergeEnvFields(
      fields.map(({ name, value, secret }) => ({ name, value, secret })),
      entries,
    );
    if (!merged.ok) {
      setEnvMessage(merged.error);
      return;
    }
    // Merged fields keep the existing order and append new ones, so uids line up.
    setFields(merged.fields.map((field, index) => ({ uid: fields[index]?.uid ?? newUid(), ...field })));
    setEnvText(null);
    setEnvMessage(
      `Importadas ${entries.length} variables.` +
        (invalid.length > 0 ? ` Se ignoraron las líneas ${invalid.join(", ")}.` : ""),
    );
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const get = (name: string) => String(form.get(name) ?? "");
    const parsed = vaultItemFormSchema.safeParse({
      label: get("item-title"),
      category: get("item-group"),
      kind,
      // Hidden account inputs are not validated for secret items.
      username: isSecret ? "" : get("item-account"),
      password: isSecret ? "" : get("item-secret"),
      url: isSecret ? "" : get("item-link"),
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
      <fieldset className="flex flex-col gap-1.5">
        <legend className="mb-1.5 text-sm font-medium">Tipo</legend>
        <div className="flex flex-wrap gap-4">
          {KIND_OPTIONS.map((option) => (
            <label key={option.value} className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="item-kind"
                value={option.value}
                checked={kind === option.value}
                onChange={() => setKind(option.value)}
              />
              {option.label}
            </label>
          ))}
        </div>
      </fieldset>
      {dropsAccountValues && (
        <p className="text-xs text-muted-foreground" role="status">
          Al guardar como Secret / API key se descartan el usuario, la contraseña y la URL.
        </p>
      )}
      {/* Account inputs stay mounted (hidden) so switching type back keeps what was typed. */}
      <div className={isSecret ? "hidden" : "flex flex-col gap-4"}>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="item-account" className="text-sm font-medium">
            Usuario
          </label>
          <input
            id="item-account"
            name="item-account"
            type="text"
            defaultValue={defaults.username}
            className={inputClass}
            {...NO_AUTOFILL}
          />
        </div>
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
        <legend className="px-1 text-sm font-medium">
          {isSecret ? "Claves y valores" : "Campos adicionales"}
        </legend>
        <p className="text-xs text-muted-foreground">
          {isSecret
            ? "Una entrada por clave (por ejemplo, STRIPE_SECRET_KEY). Los valores se ocultan por defecto. Puedes importar un archivo .env pegando su contenido."
            : "Por ejemplo, para Google OAuth: client ID, client secret, proyecto y URI de redirección. Marca como secretos los valores que deban ocultarse."}
        </p>
        {fields.map((field, index) => (
          <div key={field.uid} className="flex flex-col gap-2 rounded-lg bg-muted/40 p-3">
            <div className="flex flex-col gap-1.5">
              <label htmlFor={`cf-name-${field.uid}`} className="text-xs font-medium">
                {isSecret ? "Clave" : "Nombre del campo"}
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
            onClick={() => addFields([{ name: "", value: "", secret: isSecret }])}
          >
            <Plus /> {isSecret ? "Añadir clave" : "Añadir campo"}
          </Button>
          {isSecret ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              aria-expanded={envText !== null}
              aria-controls="env-import"
              onClick={() => {
                setEnvText((text) => (text === null ? "" : null));
                setEnvMessage(null);
              }}
            >
              <FileInput /> Importar .env
            </Button>
          ) : (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={fields.length + GOOGLE_OAUTH.length > MAX_CUSTOM_FIELDS}
              onClick={() => addFields(GOOGLE_OAUTH)}
            >
              <Plus /> Campos de Google OAuth
            </Button>
          )}
        </div>
        {isSecret && envText !== null && (
          <div id="env-import" className="flex flex-col gap-2">
            <label htmlFor="env-text" className="text-xs font-medium">
              Contenido del archivo .env
            </label>
            <textarea
              id="env-text"
              rows={5}
              value={envText}
              onChange={(event) => setEnvText(event.target.value)}
              placeholder={"API_KEY=valor\nexport REGION=\"eu-west-1\""}
              className={`${inputClass} font-mono`}
              {...NO_AUTOFILL}
            />
            <p className="text-xs text-muted-foreground">
              Se ignoran los comentarios y las líneas vacías. Las claves que ya existen se
              sobrescriben.
            </p>
            <div className="flex gap-2">
              <Button type="button" size="sm" variant="outline" onClick={importEnv}>
                Importar
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => {
                  setEnvText(null);
                  setEnvMessage(null);
                }}
              >
                Cancelar
              </Button>
            </div>
          </div>
        )}
        {envMessage && (
          <p className="text-xs text-muted-foreground" role="status">
            {envMessage}
          </p>
        )}
        {fields.length >= MAX_CUSTOM_FIELDS && (
          <p className="text-xs text-muted-foreground">
            Se admiten como máximo {MAX_CUSTOM_FIELDS} {isSecret ? "claves" : "campos adicionales"}.
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
