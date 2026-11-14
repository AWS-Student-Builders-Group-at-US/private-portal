"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/features/events/types";
import { linkFormSchema } from "./schema";
import type { LinkFormState } from "./types";

// Runs with the user's session; RLS rejects non-members.

const LINKS_PATH = "/panel/recursos";

function parse(formData: FormData) {
  const values: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string" && !key.startsWith("$")) values[key] = value;
  }
  const parsed = linkFormSchema.safeParse(values);
  if (parsed.success) return { ok: true, values, row: parsed.data } as const;
  return {
    ok: false,
    state: {
      message: "Revisa los campos marcados.",
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
      values,
    } satisfies LinkFormState,
  } as const;
}

export async function createLink(_prev: LinkFormState, formData: FormData): Promise<LinkFormState> {
  const parsed = parse(formData);
  if (!parsed.ok) return parsed.state;
  const supabase = await createClient();
  const { error } = await supabase.from("links").insert(parsed.row);
  if (error) return { message: "No se pudo guardar el enlace.", values: parsed.values };
  revalidatePath(LINKS_PATH);
  redirect(`${LINKS_PATH}?estado=creado`);
}

export async function updateLink(
  id: string,
  _prev: LinkFormState,
  formData: FormData,
): Promise<LinkFormState> {
  if (!z.uuid().safeParse(id).success) return { message: "Enlace no encontrado." };
  const parsed = parse(formData);
  if (!parsed.ok) return parsed.state;
  const supabase = await createClient();
  const { data, error } = await supabase.from("links").update(parsed.row).eq("id", id).select("id");
  if (error || !data?.length) {
    return { message: "No se pudieron guardar los cambios.", values: parsed.values };
  }
  revalidatePath(LINKS_PATH);
  redirect(`${LINKS_PATH}?estado=guardado`);
}

export async function deleteLink(id: string): Promise<ActionResult> {
  if (!z.uuid().safeParse(id).success) return { ok: false, message: "Enlace no encontrado." };
  const supabase = await createClient();
  const { data, error } = await supabase.from("links").delete().eq("id", id).select("id");
  if (error || !data?.length) return { ok: false, message: "No se pudo eliminar el enlace." };
  revalidatePath(LINKS_PATH);
  redirect(`${LINKS_PATH}?estado=eliminado`);
}
