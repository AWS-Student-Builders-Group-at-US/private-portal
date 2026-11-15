"use client";

import { useState, useTransition } from "react";
import { ArrowDown, ArrowUp, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { publishCheckinForm } from "../actions";
import {
  FIELD_TYPES,
  MAX_FIELDS,
  isFixedKey,
  type FieldType,
  type FormField,
} from "../definition";
import { FormFields } from "./form-fields";

const inputClass =
  "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

const TYPE_LABELS: Record<FieldType, string> = {
  text: "Texto",
  email: "Correo",
  select: "Desplegable",
  checkbox: "Casilla (consentimiento)",
};

export type EditorInitial = {
  title: string;
  intro: string;
  fields: FormField[];
  privacy_notice: string;
};

// Options are edited one per line; blank lines are dropped on publish.
const cleanFields = (fields: FormField[]): FormField[] =>
  fields.map((field) =>
    field.type === "select"
      ? { ...field, options: (field.options ?? []).map((o) => o.trim()).filter(Boolean) }
      : field,
  );

function nextKey(fields: FormField[]) {
  let n = fields.length + 1;
  while (fields.some((field) => field.key === `campo_${n}`)) n++;
  return `campo_${n}`;
}

export function FormEditor({
  formId,
  initial,
  disabled = false,
}: {
  formId: string;
  initial: EditorInitial;
  // Archived forms cannot get new versions.
  disabled?: boolean;
}) {
  const [title, setTitle] = useState(initial.title);
  const [intro, setIntro] = useState(initial.intro);
  const [fields, setFields] = useState(initial.fields);
  const [notice, setNotice] = useState(initial.privacy_notice);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const update = (index: number, patch: Partial<FormField>) =>
    setFields((current) =>
      current.map((field, i) => {
        if (i !== index) return field;
        const next = { ...field, ...patch };
        // Consent checkboxes are never required.
        if (next.type === "checkbox") next.required = false;
        return next;
      }),
    );
  const move = (index: number, delta: number) =>
    setFields((current) => {
      const target = index + delta;
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  const remove = (index: number) =>
    setFields((current) => current.filter((_, i) => i !== index));
  const add = () =>
    setFields((current) => [
      ...current,
      { key: nextKey(current), type: "text", label: "Nueva pregunta", required: false },
    ]);

  function publish() {
    setResult(null);
    startTransition(async () => {
      const response = await publishCheckinForm(formId, {
        title,
        intro,
        fields: cleanFields(fields),
        privacy_notice: notice,
      });
      setResult(
        response.ok
          ? { ok: true, message: "Nueva versión publicada." }
          : { ok: false, message: response.message },
      );
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Título
          <input
            value={title}
            maxLength={120}
            onChange={(e) => setTitle(e.target.value)}
            className={inputClass}
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Introducción (opcional)
          <textarea
            value={intro}
            rows={3}
            maxLength={1000}
            onChange={(e) => setIntro(e.target.value)}
            className={inputClass}
          />
        </label>

        <h2 className="font-semibold">Campos</h2>
        <ol className="flex flex-col gap-3">
          {fields.map((field, index) => {
            const fixed = isFixedKey(field.key);
            return (
              <li key={index} className="flex flex-col gap-2 rounded-lg border p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs text-muted-foreground">
                    {fixed
                      ? `Campo fijo · ${field.key} · ${TYPE_LABELS[field.type]}`
                      : `Campo ${index + 1}`}
                  </span>
                  <div className="flex gap-1">
                    <Button
                      variant="outline"
                      size="icon-sm"
                      aria-label="Subir"
                      disabled={index === 0}
                      onClick={() => move(index, -1)}
                    >
                      <ArrowUp />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon-sm"
                      aria-label="Bajar"
                      disabled={index === fields.length - 1}
                      onClick={() => move(index, 1)}
                    >
                      <ArrowDown />
                    </Button>
                    {!fixed && (
                      <Button
                        variant="outline"
                        size="icon-sm"
                        aria-label="Eliminar campo"
                        onClick={() => remove(index)}
                      >
                        <Trash2 />
                      </Button>
                    )}
                  </div>
                </div>
                <input
                  aria-label="Etiqueta"
                  placeholder="Etiqueta"
                  value={field.label}
                  maxLength={200}
                  onChange={(e) => update(index, { label: e.target.value })}
                  className={inputClass}
                />
                <input
                  aria-label="Ayuda"
                  placeholder="Texto de ayuda (opcional)"
                  value={field.help ?? ""}
                  maxLength={300}
                  onChange={(e) => update(index, { help: e.target.value })}
                  className={inputClass}
                />
                {!fixed && (
                  <div className="grid gap-2 sm:grid-cols-2">
                    <input
                      aria-label="Clave"
                      placeholder="clave_interna"
                      value={field.key}
                      maxLength={40}
                      onChange={(e) => update(index, { key: e.target.value })}
                      className={inputClass}
                    />
                    <select
                      aria-label="Tipo"
                      value={field.type}
                      onChange={(e) => update(index, { type: e.target.value as FieldType })}
                      className={inputClass}
                    >
                      {FIELD_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {TYPE_LABELS[type]}
                        </option>
                      ))}
                    </select>
                    {field.type !== "checkbox" && (
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={field.required}
                          onChange={(e) => update(index, { required: e.target.checked })}
                          className="size-4"
                        />
                        Obligatorio
                      </label>
                    )}
                    {field.type === "select" && (
                      <textarea
                        aria-label="Opciones"
                        placeholder="Una opción por línea"
                        rows={3}
                        value={(field.options ?? []).join("\n")}
                        onChange={(e) => update(index, { options: e.target.value.split("\n") })}
                        className={`${inputClass} sm:col-span-2`}
                      />
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ol>
        <Button variant="outline" onClick={add} disabled={fields.length >= MAX_FIELDS}>
          Añadir campo
        </Button>

        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Política de privacidad
          <span className="text-xs font-normal text-muted-foreground">
            Párrafos separados por una línea en blanco, títulos con «## » y listas con «- ».
          </span>
          <textarea
            value={notice}
            rows={14}
            maxLength={20000}
            onChange={(e) => setNotice(e.target.value)}
            className={`${inputClass} font-mono`}
          />
        </label>

        {result && (
          <p
            role={result.ok ? "status" : "alert"}
            className={result.ok ? "text-sm" : "text-sm text-destructive"}
          >
            {result.message}
          </p>
        )}
        <Button onClick={publish} disabled={pending || disabled}>
          {pending ? "Publicando…" : "Publicar nueva versión"}
        </Button>
      </div>

      <section aria-label="Vista previa" className="flex flex-col gap-4 rounded-lg border p-4">
        <p className="text-xs font-medium uppercase text-muted-foreground">Vista previa</p>
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-medium">{title}</h2>
          {intro && (
            <p className="whitespace-pre-line text-sm text-muted-foreground">{intro}</p>
          )}
        </div>
        <fieldset disabled className="flex flex-col gap-4">
          <FormFields fields={cleanFields(fields)} idPrefix="preview-" />
        </fieldset>
      </section>
    </div>
  );
}
