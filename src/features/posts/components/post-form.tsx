"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { ImagePlus, Trash2 } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { networkWarnings, slugify } from "../content";
import { PUBLIC_MEDIA_BUCKET, buildPostImagePath, publicMediaUrl } from "../media";
import { MAX_POST_IMAGE_BYTES, POST_TARGETS, POST_TARGET_LABELS, type PostTarget } from "../schema";
import type { PostFormState } from "../types";
import { PostPreviews } from "./post-previews";

const fieldClass =
  "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive";

export type PostFormValues = {
  title: string;
  slug: string;
  body: string;
  targets: PostTarget[];
  scheduled_at: string; // Madrid datetime-local
  event_id: string;
  image_path: string;
};

export const EMPTY_POST: PostFormValues = {
  title: "",
  slug: "",
  body: "",
  targets: ["web"],
  scheduled_at: "",
  event_id: "",
  image_path: "",
};

export function PostForm({
  action,
  initialValues = EMPTY_POST,
  events,
  submitLabel,
  cancelHref,
}: {
  action: (state: PostFormState, formData: FormData) => Promise<PostFormState>;
  initialValues?: PostFormValues;
  events: { id: string; title: string }[];
  submitLabel: string;
  cancelHref: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const sent = state.values;
  const str = (name: Exclude<keyof PostFormValues, "targets">) =>
    typeof sent?.[name] === "string" ? (sent[name] as string) : initialValues[name];

  // Controlled fields that feed the live preview.
  const [title, setTitle] = useState(str("title"));
  const [body, setBody] = useState(str("body"));
  const [targets, setTargets] = useState<PostTarget[]>(
    Array.isArray(sent?.targets) ? (sent.targets as PostTarget[]) : initialValues.targets,
  );
  const [imagePath, setImagePath] = useState(str("image_path"));
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const errors = (name: string) => state.fieldErrors?.[name];
  const invalid = (name: string) =>
    state.fieldErrors?.[name] ? { "aria-invalid": true, "aria-describedby": `${name}-error` } : {};
  const warnings = networkWarnings({ body, hasImage: !!imagePath, targets });

  async function onImage(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setUploadError(null);
    if (!file.type.startsWith("image/")) return setUploadError("Elige una imagen (JPG, PNG, WebP o GIF).");
    if (file.size > MAX_POST_IMAGE_BYTES) return setUploadError("La imagen supera los 5 MB.");
    setUploading(true);
    const path = buildPostImagePath(file.name);
    const { error } = await createClient()
      .storage.from(PUBLIC_MEDIA_BUCKET)
      .upload(path, file, { contentType: file.type, upsert: false });
    setUploading(false);
    if (error) return setUploadError("No se pudo subir la imagen.");
    setImagePath(path);
  }

  return (
    <div className="flex flex-col gap-8">
      <form action={formAction} noValidate className="flex max-w-2xl flex-col gap-4">
        <input type="hidden" name="image_path" value={imagePath} />
        <Field name="title" label="Título" errors={errors("title")}>
          <input id="title" name="title" required maxLength={200} value={title} onChange={(e) => setTitle(e.target.value)} className={fieldClass} {...invalid("title")} />
        </Field>
        <Field name="slug" label="Enlace en la web (opcional)" errors={errors("slug")}>
          <input id="slug" name="slug" maxLength={80} defaultValue={str("slug")} placeholder={slugify(title) || "se-genera-del-titulo"} className={fieldClass} {...invalid("slug")} />
        </Field>
        <Field name="body" label="Texto" errors={errors("body")}>
          <textarea id="body" name="body" rows={8} value={body} onChange={(e) => setBody(e.target.value)} className={fieldClass} {...invalid("body")} />
          <span className="text-right text-xs text-muted-foreground tabular-nums">{body.length} caracteres</span>
        </Field>
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1.5 text-sm font-medium">Dónde se publica</legend>
          <div className="flex flex-wrap gap-2">
            {POST_TARGETS.map((target) => (
              <label key={target} className="flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-sm has-checked:border-[var(--aws-orange)] has-checked:bg-accent">
                <input
                  type="checkbox"
                  name="targets"
                  value={target}
                  checked={targets.includes(target)}
                  onChange={(e) =>
                    setTargets((current) =>
                      e.target.checked ? [...current, target] : current.filter((t) => t !== target),
                    )
                  }
                  className="size-4 accent-[var(--aws-orange)]"
                />
                {POST_TARGET_LABELS[target]}
              </label>
            ))}
          </div>
          {errors("targets")?.map((e) => (
            <p key={e} className="text-sm text-destructive">{e}</p>
          ))}
        </fieldset>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field name="scheduled_at" label="Fecha de publicación (hora de Madrid)" errors={errors("scheduled_at")}>
            <input id="scheduled_at" name="scheduled_at" type="datetime-local" defaultValue={str("scheduled_at")} className={fieldClass} {...invalid("scheduled_at")} />
          </Field>
          <Field name="event_id" label="Evento (opcional)" errors={errors("event_id")}>
            <select id="event_id" name="event_id" defaultValue={str("event_id")} className={fieldClass}>
              <option value="">Ninguno</option>
              {events.map((event) => (
                <option key={event.id} value={event.id}>{event.title}</option>
              ))}
            </select>
          </Field>
        </div>
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium">Imagen</span>
          <div className="flex flex-wrap items-center gap-3">
            {imagePath && (
              // eslint-disable-next-line @next/next/no-img-element -- preview of the uploaded public image
              <img src={publicMediaUrl(imagePath)} alt="" className="h-20 w-32 rounded-lg border object-cover" />
            )}
            <label className={buttonVariants({ variant: "outline" }) + " cursor-pointer"}>
              <ImagePlus />
              {uploading ? "Subiendo…" : imagePath ? "Cambiar imagen" : "Subir imagen"}
              <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={onImage} disabled={uploading} className="sr-only" />
            </label>
            {imagePath && (
              <Button type="button" variant="ghost" onClick={() => setImagePath("")}>
                <Trash2 />
                Quitar
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground">JPG, PNG, WebP o GIF, hasta 5 MB. Será pública.</p>
          {(uploadError || errors("image_path")) && (
            <p role="alert" className="text-sm text-destructive">{uploadError ?? errors("image_path")?.[0]}</p>
          )}
        </div>

        {warnings.length > 0 && (
          <ul className="flex flex-col gap-1 rounded-lg border border-[var(--aws-orange)]/50 bg-accent px-4 py-2 text-sm text-accent-foreground">
            {warnings.map((w) => <li key={w}>{w}</li>)}
          </ul>
        )}
        {state.message && <p role="alert" className="text-sm text-destructive">{state.message}</p>}
        <div className="flex gap-2">
          <Button type="submit" disabled={pending || uploading}>
            {pending ? "Guardando…" : submitLabel}
          </Button>
          <Link href={cancelHref} className={buttonVariants({ variant: "outline" })}>Cancelar</Link>
        </div>
      </form>

      {targets.length > 0 && (title || body) && (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">Vista previa</h2>
          <PostPreviews
            post={{ title, body, targets, imageUrl: imagePath ? publicMediaUrl(imagePath) : null }}
          />
        </section>
      )}
    </div>
  );
}

function Field({ name, label, errors, children }: { name: string; label: string; errors?: string[]; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={name} className="text-sm font-medium">{label}</label>
      {children}
      {errors?.map((error) => (
        <p key={error} id={`${name}-error`} className="text-sm text-destructive">{error}</p>
      ))}
    </div>
  );
}
