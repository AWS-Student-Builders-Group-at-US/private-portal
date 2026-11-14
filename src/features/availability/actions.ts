"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/features/events/types";
import { getCurrentMember } from "@/lib/auth/member";
import { overrideFormSchema, templateRangesSchema } from "./schema";
import type { OverrideFormState } from "./types";

// Every action runs with the user's session; RLS only lets members write
// their own availability rows.

const CALENDAR_PATH = "/panel/calendario";

// Replaces the member's weekly template. The new rows are inserted before the
// old ones are deleted, so a failure never leaves the member with nothing.
export async function saveTemplate(ranges: unknown): Promise<ActionResult> {
  const parsed = templateRangesSchema.safeParse(ranges);
  if (!parsed.success) {
    return { ok: false, message: "La disponibilidad no es válida." };
  }
  const { email } = await getCurrentMember();
  const supabase = await createClient();

  const { data: old, error: readError } = await supabase
    .from("availability_template")
    .select("id")
    .eq("member_email", email);
  if (readError) return { ok: false, message: "No se pudo guardar. Inténtalo de nuevo." };

  if (parsed.data.length > 0) {
    const { error } = await supabase
      .from("availability_template")
      .insert(parsed.data.map((range) => ({ ...range, member_email: email })));
    if (error) return { ok: false, message: "No se pudo guardar. Inténtalo de nuevo." };
  }
  if (old.length > 0) {
    const { error } = await supabase
      .from("availability_template")
      .delete()
      .in("id", old.map((row) => row.id));
    if (error) {
      return { ok: false, message: "Se guardó a medias. Recarga la página y revisa." };
    }
  }

  revalidatePath(CALENDAR_PATH);
  return { ok: true };
}

export async function addOverride(
  _prev: OverrideFormState,
  formData: FormData,
): Promise<OverrideFormState> {
  const values: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string" && !key.startsWith("$")) values[key] = value;
  }
  const parsed = overrideFormSchema.safeParse(values);
  if (!parsed.success) {
    return {
      message: "Revisa los campos marcados.",
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
      values,
    };
  }
  const { email } = await getCurrentMember();
  const supabase = await createClient();
  const { error } = await supabase
    .from("availability_override")
    .insert({ ...parsed.data, member_email: email });
  if (error) {
    return { message: "No se pudo guardar el cambio. Inténtalo de nuevo.", values };
  }
  revalidatePath(CALENDAR_PATH);
  return { ok: true };
}

export async function deleteOverride(id: string): Promise<ActionResult> {
  if (!z.uuid().safeParse(id).success) {
    return { ok: false, message: "Cambio no encontrado." };
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("availability_override")
    .delete()
    .eq("id", id)
    .select("id");
  if (error || !data?.length) {
    return { ok: false, message: "No se pudo eliminar el cambio." };
  }
  revalidatePath(CALENDAR_PATH);
  return { ok: true };
}
