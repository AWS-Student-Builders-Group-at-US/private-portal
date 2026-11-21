"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/features/events/types";
import { getCurrentMember } from "@/lib/auth/member";
import { manualEditSchema, manualRows, noteFormSchema, noteTextSchema } from "./schema";
import type { NoteFormState } from "./types";

// Every action runs with the user's session; RLS only lets members write
// their own availability notes and hand edits.

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

// Hand edit of the member's own week: sets every slot of the rectangle to the
// chosen occupation (replacing Google there), or with "google" removes the
// edits so those slots follow Google again.
export async function editMyAvailability(input: unknown): Promise<ActionResult> {
  const parsed = manualEditSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: "La franja seleccionada no es válida." };
  }
  const edit = parsed.data;
  const { email } = await getCurrentMember();
  const supabase = await createClient();
  const { error } =
    edit.choice === "google"
      ? await supabase
          .from("availability_manual")
          .delete()
          .eq("member_email", email)
          .gte("date", edit.start_date)
          .lte("date", edit.end_date)
          .gte("start_minute", edit.start_minute)
          .lt("start_minute", edit.end_minute)
      : await supabase
          .from("availability_manual")
          .upsert(manualRows(edit, email, Number(edit.choice)), {
            onConflict: "member_email,date,start_minute",
          });
  if (error) {
    return { ok: false, message: "No se pudo guardar tu disponibilidad. Inténtalo de nuevo." };
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
