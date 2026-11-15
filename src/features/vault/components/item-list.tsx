"use client";

import { useEffect, useState } from "react";
import { Copy, ExternalLink, Eye, EyeOff, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { errorMessage, type VaultItem } from "../data";
import { serializeEnv } from "../env";
import { isSafeUrl, type VaultCustomField } from "../schema";
import { useVault } from "./vault-provider";

const MESSAGE_MS = 4000;

function mask(value: string) {
  if (!value) return "—";
  return value.length <= 2 ? "••" : `${value.slice(0, 2)}${"•".repeat(6)}`;
}

export function ItemList({
  items,
  onEdit,
}: {
  items: VaultItem[];
  onEdit: (item: VaultItem) => void;
}) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">No hay elementos.</p>;
  }
  return (
    <ul className="flex flex-col gap-3">
      {items.map((item) => (
        <ItemRow key={item.id} item={item} onEdit={() => onEdit(item)} />
      ))}
    </ul>
  );
}

function ItemRow({ item, onEdit }: { item: VaultItem; onEdit: () => void }) {
  const { remove } = useVault();
  const [showPassword, setShowPassword] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const payload = item.payload;
  const isSecret = payload?.kind === "secret";

  // Copy/status messages disappear after a few seconds.
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(null), MESSAGE_MS);
    return () => clearTimeout(timer);
  }, [message]);

  // Must run inside the click handler (clipboard needs a user gesture).
  async function copy(value: string, what: string) {
    try {
      await navigator.clipboard.writeText(value);
      setMessage(`Copiado: ${what}.`);
    } catch {
      setMessage("No se pudo copiar. Muestra el valor y cópialo manualmente.");
    }
  }

  // Copies a secret item's keys as `.env` lines; keys that are not valid
  // variable names are left out and reported.
  async function copyAsEnv() {
    if (!payload) return;
    const { text, skipped } = serializeEnv(payload.fields);
    if (text === "") {
      setMessage("Ninguna clave tiene un nombre válido para un archivo .env.");
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      setMessage(
        skipped.length > 0
          ? `Copiado como .env. Se omitieron claves con nombres no válidos: ${skipped.join(", ")}.`
          : "Copiado como .env.",
      );
    } catch {
      setMessage("No se pudo copiar. Muestra los valores y cópialos manualmente.");
    }
  }

  async function confirmDelete() {
    setPending(true);
    try {
      await remove(item.id);
    } catch (caught) {
      setMessage(errorMessage(caught));
      setPending(false);
    }
  }

  return (
    <li className="flex flex-col gap-2 rounded-lg border p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="font-medium">{item.label}</span>
        {item.category && (
          <span className="text-xs text-muted-foreground">{item.category}</span>
        )}
      </div>

      {payload ? (
        <>
          {isSecret ? (
            <p className="text-xs text-muted-foreground">
              Secret / API key · {payload.fields.length}{" "}
              {payload.fields.length === 1 ? "clave" : "claves"}
            </p>
          ) : (
            <p className="text-sm">
              <span className="text-muted-foreground">Usuario: </span>
              {mask(payload.username)}
            </p>
          )}
          {!isSecret && showPassword && (
            <p className="font-mono text-sm break-all">{payload.password || "—"}</p>
          )}
          <div className="flex flex-wrap gap-2">
            {isSecret ? (
              <Button
                size="sm"
                variant="outline"
                disabled={payload.fields.length === 0}
                onClick={copyAsEnv}
              >
                <Copy /> Copiar como .env
              </Button>
            ) : (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copy(payload.username, "Usuario")}
                >
                  <Copy /> Copiar usuario
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copy(payload.password, "Contraseña")}
                >
                  <Copy /> Copiar contraseña
                </Button>
                <Button size="sm" variant="outline" onClick={() => setShowPassword((v) => !v)}>
                  {showPassword ? <EyeOff /> : <Eye />}
                  {showPassword ? "Ocultar" : "Mostrar"}
                </Button>
              </>
            )}
            {!isSecret && isSafeUrl(payload.url) && (
              <a
                href={payload.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-7 items-center gap-1 rounded-lg border px-2.5 text-[0.8rem] font-medium hover:bg-muted"
              >
                <ExternalLink className="size-3.5" /> Abrir
              </a>
            )}
            <Button size="sm" variant="outline" onClick={onEdit}>
              <Pencil /> Editar
            </Button>
            <Button size="sm" variant="destructive" onClick={() => setConfirming(true)}>
              <Trash2 /> Eliminar
            </Button>
          </div>
          {payload.fields.length > 0 && (
            <dl className="flex flex-col gap-2 border-t pt-2">
              {payload.fields.map((field, index) => (
                <CustomFieldRow
                  key={`${index}-${field.name}`}
                  field={field}
                  onCopy={() => copy(field.value, field.name)}
                />
              ))}
            </dl>
          )}
          {payload.notes && (
            <p className="text-sm whitespace-pre-wrap text-muted-foreground">{payload.notes}</p>
          )}
        </>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm text-destructive">No se puede descifrar.</p>
          <Button size="sm" variant="destructive" onClick={() => setConfirming(true)}>
            <Trash2 /> Eliminar
          </Button>
        </div>
      )}

      {confirming && (
        <div className="flex flex-col gap-2 rounded-lg border border-destructive/40 p-3">
          <p className="text-sm">¿Eliminar «{item.label}»? Esta acción no se puede deshacer.</p>
          <div className="flex gap-2">
            <Button size="sm" variant="destructive" onClick={confirmDelete} disabled={pending}>
              {pending ? "Eliminando…" : "Sí, eliminar"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setConfirming(false)}
              disabled={pending}
            >
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {message && (
        <p role="status" className="text-sm text-muted-foreground">
          {message}
        </p>
      )}
    </li>
  );
}

function CustomFieldRow({ field, onCopy }: { field: VaultCustomField; onCopy: () => void }) {
  const [shown, setShown] = useState(false);
  const hidden = field.secret && !shown;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <dt className="text-sm text-muted-foreground">{field.name}:</dt>
      <dd className="min-w-0 flex-1 font-mono text-sm break-all">
        {hidden ? mask(field.value) : field.value || "—"}
      </dd>
      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={onCopy} aria-label={`Copiar ${field.name}`}>
          <Copy /> Copiar
        </Button>
        {field.secret && (
          <Button size="sm" variant="outline" onClick={() => setShown((v) => !v)}>
            {shown ? <EyeOff /> : <Eye />}
            {shown ? "Ocultar" : "Mostrar"}
          </Button>
        )}
      </div>
    </div>
  );
}
