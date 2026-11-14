"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import type { LinkFormState } from "../types";

const fieldClass =
  "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive";

export type LinkFormValues = { title: string; url: string; category: string; notes: string };
const EMPTY: LinkFormValues = { title: "", url: "", category: "", notes: "" };

export function LinkForm({
  action,
  initialValues = EMPTY,
  categories,
  submitLabel,
}: {
  action: (state: LinkFormState, formData: FormData) => Promise<LinkFormState>;
  initialValues?: LinkFormValues;
  categories: string[];
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const value = (name: keyof LinkFormValues) => state.values?.[name] ?? initialValues[name];
  const field = (name: keyof LinkFormValues, label: string, input: React.ReactNode) => (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={name} className="text-sm font-medium">
        {label}
      </label>
      {input}
      {state.fieldErrors?.[name]?.map((error) => (
        <p key={error} id={`${name}-error`} className="text-sm text-destructive">
          {error}
        </p>
      ))}
    </div>
  );
  const invalid = (name: string) =>
    state.fieldErrors?.[name] ? { "aria-invalid": true, "aria-describedby": `${name}-error` } : {};

  return (
    <form action={formAction} noValidate className="flex max-w-xl flex-col gap-4">
      {field(
        "title",
        "Título",
        <input id="title" name="title" required maxLength={200} defaultValue={value("title")} className={fieldClass} {...invalid("title")} />,
      )}
      {field(
        "url",
        "URL",
        <input id="url" name="url" type="url" inputMode="url" placeholder="https://…" defaultValue={value("url")} className={fieldClass} {...invalid("url")} />,
      )}
      {field(
        "category",
        "Categoría",
        <>
          <input id="category" name="category" list="link-categories" maxLength={60} defaultValue={value("category")} className={fieldClass} {...invalid("category")} />
          <datalist id="link-categories">
            {categories.map((category) => (
              <option key={category} value={category} />
            ))}
          </datalist>
        </>,
      )}
      {field(
        "notes",
        "Notas",
        <textarea id="notes" name="notes" rows={3} defaultValue={value("notes")} className={fieldClass} {...invalid("notes")} />,
      )}
      {state.message && (
        <p className="text-sm text-destructive" role="alert">
          {state.message}
        </p>
      )}
      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Guardando…" : submitLabel}
        </Button>
        <Link href="/panel/recursos" className={buttonVariants({ variant: "outline" })}>
          Cancelar
        </Link>
      </div>
    </form>
  );
}
