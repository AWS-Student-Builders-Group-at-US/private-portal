"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ConfirmAction } from "@/features/checkin/components/attendance-controls";
import type { ActionResult } from "@/features/events/types";
import {
  createCheckinFormTemplate,
  renameCheckinFormTemplate,
  setCheckinFormTemplateArchived,
  setDefaultCheckinFormTemplate,
} from "../actions";
import type { FormSummary } from "../resolve";

const inputClass =
  "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

const badgeClass = "ml-2 rounded-full px-2 py-0.5 text-xs";

function ErrorText({ message }: { message: string | null }) {
  return message ? (
    <p className="text-sm text-destructive" role="alert">
      {message}
    </p>
  ) : null;
}

export function CreateFormButton() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function create(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createCheckinFormTemplate(name);
      if (!result.ok) setError(result.message);
      else if (result.data) router.push(`/panel/eventos/formularios/${result.data}`);
    });
  }

  return (
    <form onSubmit={create} className="flex flex-col gap-2">
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          aria-label="Nombre del nuevo formulario"
          placeholder="Nombre (p. ej. Taller)"
          value={name}
          maxLength={80}
          onChange={(e) => setName(e.target.value)}
          className={inputClass}
        />
        <Button type="submit" disabled={pending || name.trim() === ""}>
          {pending ? "Creando…" : "Crear formulario"}
        </Button>
      </div>
      <ErrorText message={error} />
    </form>
  );
}

function FormRow({ form }: { form: FormSummary }) {
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(form.name);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function run(action: () => Promise<ActionResult>, onDone?: () => void) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) setError(result.message);
      else onDone?.();
    });
  }

  const archived = form.archived_at !== null;

  return (
    <li className="flex flex-col gap-2 px-4 py-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        {renaming ? (
          <form
            className="flex flex-1 flex-col gap-2 sm:flex-row"
            onSubmit={(e) => {
              e.preventDefault();
              run(
                () => renameCheckinFormTemplate(form.id, name),
                () => setRenaming(false),
              );
            }}
          >
            <input
              aria-label="Nombre del formulario"
              value={name}
              maxLength={80}
              onChange={(e) => setName(e.target.value)}
              className={inputClass}
            />
            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={pending}>
                Guardar
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={pending}
                onClick={() => {
                  setName(form.name);
                  setRenaming(false);
                }}
              >
                Cancelar
              </Button>
            </div>
          </form>
        ) : (
          <div className="flex flex-col text-sm">
            <span className="font-medium">
              <Link
                href={`/panel/eventos/formularios/${form.id}`}
                className="underline-offset-4 hover:underline"
              >
                {form.name}
              </Link>
              {form.is_default && (
                <span className={`${badgeClass} bg-primary text-primary-foreground`}>
                  Por defecto
                </span>
              )}
              {archived && <span className={`${badgeClass} bg-muted`}>Archivado</span>}
            </span>
            <span className="text-muted-foreground">
              {form.latest_version === null
                ? "Sin versiones publicadas"
                : `Versión ${form.latest_version} · ${form.version_count} ${
                    form.version_count === 1 ? "versión" : "versiones"
                  }`}
            </span>
          </div>
        )}
        {!renaming && (
          <div className="flex flex-wrap items-start gap-2">
            <Button variant="outline" size="sm" onClick={() => setRenaming(true)}>
              Renombrar
            </Button>
            {!form.is_default && !archived && form.latest_version !== null && (
              <ConfirmAction
                label="Marcar por defecto"
                question={`Los eventos sin formulario elegido usarán «${form.name}». ¿Continuar?`}
                confirmLabel="Sí, marcar"
                action={() => setDefaultCheckinFormTemplate(form.id)}
              />
            )}
            {!form.is_default && (
              <Button
                variant="outline"
                size="sm"
                disabled={pending}
                onClick={() => run(() => setCheckinFormTemplateArchived(form.id, !archived))}
              >
                {archived ? "Desarchivar" : "Archivar"}
              </Button>
            )}
          </div>
        )}
      </div>
      <ErrorText message={error} />
    </li>
  );
}

export function FormsList({ forms }: { forms: FormSummary[] }) {
  return (
    <ul className="flex flex-col divide-y rounded-lg border">
      {forms.map((form) => (
        <FormRow key={form.id} form={form} />
      ))}
    </ul>
  );
}
