"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/features/events/types";
import { checkinFormContentSchema } from "./definition";

// Member-only actions with the user's session. Writes go through the
// security definer functions, which re-check membership and keep versions
// immutable and a single active one.

const EDITOR_PATH = "/panel/eventos/formularios";

export async function publishCheckinForm(input: unknown): Promise<ActionResult> {
  const parsed = checkinFormContentSchema.safeParse(input);
  if (!parsed.success) {
    const messages = [...new Set(parsed.error.issues.map((issue) => issue.message))];
    return { ok: false, message: messages.slice(0, 5).join(" ") };
  }
  const { title, intro, fields, privacy_notice } = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.rpc("publish_checkin_form", {
    p_title: title,
    p_intro: intro,
    p_fields: fields,
    p_privacy_notice: privacy_notice,
  });
  if (error) return { ok: false, message: "No se pudo publicar la nueva versión." };
  revalidatePath(EDITOR_PATH);
  return { ok: true };
}

export async function activateCheckinForm(id: string): Promise<ActionResult> {
  if (!z.uuid().safeParse(id).success) {
    return { ok: false, message: "Versión no encontrada." };
  }
  const supabase = await createClient();
  const { error } = await supabase.rpc("activate_checkin_form", { p_id: id });
  if (error) return { ok: false, message: "No se pudo reactivar la versión." };
  revalidatePath(EDITOR_PATH);
  return { ok: true };
}
