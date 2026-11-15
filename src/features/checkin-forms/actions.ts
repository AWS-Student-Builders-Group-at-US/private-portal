"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/features/events/types";
import { checkinFormContentSchema } from "./definition";

// Member-only actions with the user's session. Writes go through the
// security definer functions, which re-check membership, keep versions
// immutable and keep exactly one default form.

const FORMS_PATH = "/panel/eventos/formularios";
const formPath = (id: string) => `${FORMS_PATH}/${id}`;
const idSchema = z.uuid();
const nameSchema = z
  .string()
  .trim()
  .min(1, "El nombre es obligatorio.")
  .max(80, "El nombre admite como máximo 80 caracteres.");

function revalidateForms(id?: string) {
  revalidatePath(FORMS_PATH);
  if (id) revalidatePath(formPath(id));
  // Event pages show the form name and the select lists forms.
  revalidatePath("/panel/eventos", "layout");
}

export async function createCheckinFormTemplate(
  name: string,
): Promise<ActionResult<string>> {
  const parsed = nameSchema.safeParse(name);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_checkin_form_template", {
    p_name: parsed.data,
  });
  if (error || typeof data !== "string") {
    return { ok: false, message: "No se pudo crear el formulario." };
  }
  revalidateForms();
  return { ok: true, data };
}

export async function renameCheckinFormTemplate(
  id: string,
  name: string,
): Promise<ActionResult> {
  const parsed = nameSchema.safeParse(name);
  if (!idSchema.safeParse(id).success) return { ok: false, message: "Formulario no encontrado." };
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };
  const supabase = await createClient();
  const { error } = await supabase.rpc("rename_checkin_form_template", {
    p_id: id,
    p_name: parsed.data,
  });
  if (error) return { ok: false, message: "No se pudo renombrar el formulario." };
  revalidateForms(id);
  return { ok: true };
}

export async function setDefaultCheckinFormTemplate(id: string): Promise<ActionResult> {
  if (!idSchema.safeParse(id).success) return { ok: false, message: "Formulario no encontrado." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_default_checkin_form_template", { p_id: id });
  if (error) {
    return {
      ok: false,
      message: "No se pudo marcar por defecto. Publica antes al menos una versión.",
    };
  }
  revalidateForms(id);
  return { ok: true };
}

export async function setCheckinFormTemplateArchived(
  id: string,
  archived: boolean,
): Promise<ActionResult> {
  if (!idSchema.safeParse(id).success) return { ok: false, message: "Formulario no encontrado." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_checkin_form_template_archived", {
    p_id: id,
    p_archived: archived === true,
  });
  if (error) {
    return {
      ok: false,
      message: archived
        ? "No se pudo archivar. El formulario por defecto no se puede archivar."
        : "No se pudo restaurar el formulario.",
    };
  }
  revalidateForms(id);
  return { ok: true };
}

export async function publishCheckinForm(
  formId: string,
  input: unknown,
): Promise<ActionResult> {
  if (!idSchema.safeParse(formId).success) {
    return { ok: false, message: "Formulario no encontrado." };
  }
  const parsed = checkinFormContentSchema.safeParse(input);
  if (!parsed.success) {
    const messages = [...new Set(parsed.error.issues.map((issue) => issue.message))];
    return { ok: false, message: messages.slice(0, 5).join(" ") };
  }
  const { title, intro, fields, privacy_notice } = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.rpc("publish_checkin_form_version", {
    p_form_id: formId,
    p_title: title,
    p_intro: intro,
    p_fields: fields,
    p_privacy_notice: privacy_notice,
  });
  if (error) return { ok: false, message: "No se pudo publicar la nueva versión." };
  revalidateForms(formId);
  return { ok: true };
}

// Versions are immutable: restoring an older one publishes a copy of it as
// the form's newest version.
export async function restoreCheckinFormVersion(id: string): Promise<ActionResult> {
  if (!idSchema.safeParse(id).success) return { ok: false, message: "Versión no encontrada." };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("checkin_forms")
    .select("form_id, title, intro, fields, privacy_notice")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return { ok: false, message: "Versión no encontrada." };
  const { form_id, ...content } = data;
  return publishCheckinForm(form_id, { ...content, intro: content.intro ?? "" });
}
