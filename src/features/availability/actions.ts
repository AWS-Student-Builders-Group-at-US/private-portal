"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/features/events/types";
import { getCurrentMember } from "@/lib/auth/member";
import { noteFormSchema, noteTextSchema } from "./schema";
import type { NoteFormState } from "./types";

// Every action runs with the user's session; RLS only lets members write
// their own availability notes.

const CALENDAR_PATH = "/panel/calendario";

function formValues(formData: FormData) {
  const values: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string" && !key.startsWith("$")) values[key] = value;
  }
  return values;
}

function invalid(error: z.ZodError): NoteFormState {
  return {
    message: "Revisa los campos marcados.",
    fieldErrors: z.flattenError(error).fieldErrors,
  };
}

export async function createNote(
  _prev: NoteFormState,
  formData: FormData,
): Promise<NoteFormState> {
  const parsed = noteFormSchema.safeParse(formValues(formData));
  if (!parsed.success) return invalid(parsed.error);
  const { email } = await getCurrentMember();
  const supabase = await createClient();
  const { error } = await supabase
    .from("availability_notes")
    .insert({ ...parsed.data, member_email: email });
  if (error) return { message: "No se pudo guardar la nota. Inténtalo de nuevo." };
  revalidatePath(CALENDAR_PATH);
  return { ok: true };
}

// Changes the title and content of one of the member's own notes.
export async function updateNote(
  id: string,
  _prev: NoteFormState,
  formData: FormData,
): Promise<NoteFormState> {
  if (!z.uuid().safeParse(id).success) return { message: "Nota no encontrada." };
  const parsed = noteTextSchema.safeParse(formValues(formData));
  if (!parsed.success) return invalid(parsed.error);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("availability_notes")
    .update(parsed.data)
    .eq("id", id)
    .select("id");
  if (error || !data?.length) {
    return { message: "No se pudo guardar la nota. Inténtalo de nuevo." };
  }
  revalidatePath(CALENDAR_PATH);
  return { ok: true };
}

export async function deleteNote(id: string): Promise<ActionResult> {
  if (!z.uuid().safeParse(id).success) {
    return { ok: false, message: "Nota no encontrada." };
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("availability_notes")
    .delete()
    .eq("id", id)
    .select("id");
  if (error || !data?.length) {
    return { ok: false, message: "No se pudo eliminar la nota." };
  }
  revalidatePath(CALENDAR_PATH);
  return { ok: true };
}
