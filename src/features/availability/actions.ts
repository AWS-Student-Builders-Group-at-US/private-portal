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

// Hand edit of the member's own week, for every slot of the rectangle:
// - "0" / "0.5" / "1": sets the occupation (replacing Google there);
// - "google": drops the edited occupation so the slots follow Google again;
// - "online" / "not_online": sets or clears the "solo online" mark, keeping
//   the occupation as it is.
// Rows left with no value and no online mark are removed.
export async function editMyAvailability(input: unknown): Promise<ActionResult> {
  const parsed = manualEditSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: "La franja seleccionada no es válida." };
  }
  const edit = parsed.data;
  const { email } = await getCurrentMember();
  const supabase = await createClient();
  const failed = {
    ok: false as const,
    message: "No se pudo guardar tu disponibilidad. Inténtalo de nuevo.",
  };
  const table = () => supabase.from("availability_manual");
  const range = { from: edit.start_date, to: edit.end_date };
  const minutes = { from: edit.start_minute, to: edit.end_minute };
  const onConflict = "member_email,date,start_minute";

  let result;
  if (edit.choice === "online") {
    result = await table().upsert(manualRows(edit, email, { online_only: true }), {
      onConflict,
    });
  } else if (edit.choice === "google" || edit.choice === "not_online") {
    result = await table()
      .update(edit.choice === "google" ? { value: null } : { online_only: false })
      .eq("member_email", email)
      .gte("date", range.from)
      .lte("date", range.to)
      .gte("start_minute", minutes.from)
      .lt("start_minute", minutes.to);
    if (!result.error) {
      result = await table()
        .delete()
        .eq("member_email", email)
        .gte("date", range.from)
        .lte("date", range.to)
        .gte("start_minute", minutes.from)
        .lt("start_minute", minutes.to)
        .is("value", null)
        .eq("online_only", false);
    }
  } else {
    result = await table().upsert(manualRows(edit, email, { value: Number(edit.choice) }), {
      onConflict,
    });
  }
  if (result.error) return failed;
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
