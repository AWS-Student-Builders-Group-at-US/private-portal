"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { ActionResult } from "@/features/events/types";
import { getCurrentMember } from "@/lib/auth/member";
import { withStatus } from "@/lib/navigation";
import { createClient } from "@/lib/supabase/server";
import { NEWS_TAG } from "@/features/site/queries";
import { PUBLIC_MEDIA_BUCKET } from "./media";
import { IMAGE_PATH_PATTERN, postFormSchema, postStatusSchema, type PostStatus } from "./schema";
import type { PostFormState } from "./types";
import { checkTransition } from "./workflow";

// Runs with the user's session (never the secret key). RLS rejects
// non-members; the posts_enforce_workflow trigger enforces the status rules
// (including approval by another member) even if these checks are bypassed.

const POSTS_PATH = "/panel/publicaciones";
// Public news pages are cached; mark them stale after any change.
const refreshNews = () => revalidateTag(NEWS_TAG, "max");
const postPath = (id: string) => `${POSTS_PATH}/${id}`;
const idSchema = z.uuid();

function formValues(formData: FormData) {
  const values: Record<string, string | string[]> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value !== "string" || key.startsWith("$")) continue;
    if (key === "targets") values.targets = [...((values.targets as string[]) ?? []), value];
    else values[key] = value;
  }
  values.targets ??= [];
  return values;
}

function parse(formData: FormData) {
  const values = formValues(formData);
  const parsed = postFormSchema.safeParse(values);
  if (parsed.success) return { ok: true, values, row: parsed.data } as const;
  return {
    ok: false,
    state: {
      message: "Revisa los campos marcados.",
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
      values,
    } satisfies PostFormState,
  } as const;
}

function saveError(error: { code?: string }, values: PostFormState["values"]): PostFormState {
  if (error.code === "23505") {
    return {
      message: "Revisa los campos marcados.",
      fieldErrors: { slug: ["Ya hay otra publicación con ese enlace."] },
      values,
    };
  }
  return { message: "No se pudo guardar la publicación. Inténtalo de nuevo.", values };
}

async function removeImage(path: string | null | undefined) {
  if (!path || !IMAGE_PATH_PATTERN.test(path)) return;
  const supabase = await createClient();
  await supabase.storage.from(PUBLIC_MEDIA_BUCKET).remove([path]);
}

export async function createPost(_prev: PostFormState, formData: FormData): Promise<PostFormState> {
  const parsed = parse(formData);
  if (!parsed.ok) return parsed.state;
  const supabase = await createClient();
  const { data, error } = await supabase.from("posts").insert(parsed.row).select("id").single();
  if (error || !data) return saveError(error ?? {}, parsed.values);
  revalidatePath(POSTS_PATH);
  redirect(withStatus(postPath(data.id), "creada"));
}

export async function updatePost(
  id: string,
  _prev: PostFormState,
  formData: FormData,
): Promise<PostFormState> {
  if (!idSchema.safeParse(id).success) return { message: "Publicación no encontrada." };
  const parsed = parse(formData);
  if (!parsed.ok) return parsed.state;

  const supabase = await createClient();
  const { data: before, error: readError } = await supabase
    .from("posts")
    .select("status, image_path, source")
    .eq("id", id)
    .maybeSingle();
  if (readError || !before) return { message: "Publicación no encontrada.", values: parsed.values };
  if (before.source === "zernio") {
    return { message: "Las publicaciones de Zernio se editan en Zernio.", values: parsed.values };
  }
  if (before.status === "approved" || before.status === "published") {
    return {
      message: "Una publicación aprobada no se puede editar. Retira la aprobación primero.",
      values: parsed.values,
    };
  }

  const { data, error } = await supabase.from("posts").update(parsed.row).eq("id", id).select("id");
  if (error || !data?.length) return saveError(error ?? {}, parsed.values);
  if (before.image_path && before.image_path !== parsed.row.image_path) {
    await removeImage(before.image_path);
  }
  refreshNews();
  revalidatePath(POSTS_PATH);
  revalidatePath(postPath(id));
  redirect(withStatus(postPath(id), "guardada"));
}

export async function changePostStatus(id: string, to: string): Promise<ActionResult> {
  const target = postStatusSchema.safeParse(to);
  if (!idSchema.safeParse(id).success || !target.success) {
    return { ok: false, message: "No se pudo cambiar el estado." };
  }
  const { email } = await getCurrentMember();
  const supabase = await createClient();
  const { data: post } = await supabase
    .from("posts")
    .select("status, created_by, source")
    .eq("id", id)
    .maybeSingle();
  if (!post) return { ok: false, message: "Publicación no encontrada." };
  if (post.source === "zernio") {
    return { ok: false, message: "El estado de las publicaciones de Zernio lo gestiona Zernio." };
  }

  const problem = checkTransition(
    { status: post.status as PostStatus, created_by: post.created_by },
    target.data,
    email,
  );
  if (problem) return { ok: false, message: problem };

  const { data, error } = await supabase
    .from("posts")
    .update({ status: target.data })
    .eq("id", id)
    .eq("status", post.status) // someone else may have moved it meanwhile
    .select("id");
  if (error || !data?.length) {
    return { ok: false, message: "No se pudo cambiar el estado. Recarga e inténtalo de nuevo." };
  }
  refreshNews();
  revalidatePath(POSTS_PATH);
  revalidatePath(postPath(id));
  return { ok: true };
}

// Any member can show or hide any post (panel or Zernio) on the website.
// The column grant only allows show_on_site; the trigger keeps everything else.
export async function setPostOnSite(id: string, show: boolean): Promise<ActionResult> {
  if (!idSchema.safeParse(id).success || typeof show !== "boolean") {
    return { ok: false, message: "Publicación no encontrada." };
  }
  await getCurrentMember();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("posts")
    .update({ show_on_site: show })
    .eq("id", id)
    .select("id");
  if (error || !data?.length) return { ok: false, message: "No se pudo cambiar la visibilidad en la web." };
  refreshNews();
  revalidatePath(POSTS_PATH);
  revalidatePath(postPath(id));
  return { ok: true };
}

export async function deletePost(id: string): Promise<ActionResult> {
  if (!idSchema.safeParse(id).success) return { ok: false, message: "Publicación no encontrada." };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("posts")
    .delete()
    .eq("id", id)
    .select("image_path");
  if (error || !data?.length) return { ok: false, message: "No se pudo eliminar la publicación." };
  await removeImage(data[0].image_path as string | null);
  refreshNews();
  revalidatePath(POSTS_PATH);
  redirect(withStatus(POSTS_PATH, "eliminada"));
}
