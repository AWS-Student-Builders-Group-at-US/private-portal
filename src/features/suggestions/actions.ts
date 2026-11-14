"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/features/events/types";
import { getCurrentMember } from "@/lib/auth/member";
import { suggestionFormSchema, suggestionStatusSchema } from "./schema";
import type { SuggestionFormState } from "./types";

// Runs with the user's session; RLS rejects non-members and only lets each
// member sign or vote as themselves.

const PATHS = ["/panel/sugerencias", "/panel"];
const revalidate = () => PATHS.forEach((path) => revalidatePath(path));
const idSchema = z.uuid();

export async function createSuggestion(
  _prev: SuggestionFormState,
  formData: FormData,
): Promise<SuggestionFormState> {
  const values = {
    body: String(formData.get("body") ?? ""),
    anonymous: formData.get("anonymous") === "on" ? "on" : "",
  };
  const parsed = suggestionFormSchema.safeParse(values);
  if (!parsed.success) {
    return {
      message: "Revisa el texto de la sugerencia.",
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
      values,
    };
  }
  const { email } = await getCurrentMember();
  const supabase = await createClient();
  const { error } = await supabase.from("suggestions").insert({
    body: parsed.data.body,
    author_email: parsed.data.anonymous ? null : email,
  });
  if (error) return { message: "No se pudo enviar la sugerencia.", values };
  revalidate();
  return { ok: true };
}

export async function toggleVote(id: string, vote: boolean): Promise<ActionResult> {
  if (!idSchema.safeParse(id).success) return { ok: false, message: "Sugerencia no encontrada." };
  const { email } = await getCurrentMember();
  const supabase = await createClient();
  const { error } = vote
    ? await supabase
        .from("suggestion_votes")
        .upsert({ suggestion_id: id, member_email: email }, { ignoreDuplicates: true })
    : await supabase
        .from("suggestion_votes")
        .delete()
        .eq("suggestion_id", id)
        .eq("member_email", email);
  if (error) return { ok: false, message: "No se pudo registrar el voto." };
  revalidate();
  return { ok: true };
}

export async function setSuggestionStatus(id: string, status: string): Promise<ActionResult> {
  const parsed = suggestionStatusSchema.safeParse(status);
  if (!idSchema.safeParse(id).success || !parsed.success) {
    return { ok: false, message: "No se pudo cambiar el estado." };
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("suggestions")
    .update({ status: parsed.data })
    .eq("id", id)
    .select("id");
  if (error || !data?.length) return { ok: false, message: "No se pudo cambiar el estado." };
  revalidate();
  return { ok: true };
}

export async function deleteSuggestion(id: string): Promise<ActionResult> {
  if (!idSchema.safeParse(id).success) return { ok: false, message: "Sugerencia no encontrada." };
  const supabase = await createClient();
  const { data, error } = await supabase.from("suggestions").delete().eq("id", id).select("id");
  if (error || !data?.length) return { ok: false, message: "No se pudo eliminar la sugerencia." };
  revalidate();
  return { ok: true };
}
