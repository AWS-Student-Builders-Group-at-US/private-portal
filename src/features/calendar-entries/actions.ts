"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/features/events/types";
import { getCurrentMember } from "@/lib/auth/member";
import { entryFormSchema } from "./schema";
import type { EntryFormState } from "./types";

// Every action runs with the user's session; RLS only lets members write
// their own calendar entries, and meeting organizers manage group meetings.

const CALENDAR_PATH = "/panel/calendario";
const NOT_ORGANIZER =
  "Solo la cuenta común y las personas autorizadas en Ajustes pueden programar reuniones del grupo.";

// The trigger on calendar_entries raises 'not_meeting_organizer' (42501).
function saveError(error: { code?: string; message?: string }) {
  if (error.code === "42501" || error.message?.includes("not_meeting_organizer")) {
    return { message: NOT_ORGANIZER };
  }
  return { message: "No se pudo guardar la entrada. Inténtalo de nuevo." };
}

function formValues(formData: FormData) {
  const values: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string" && !key.startsWith("$")) values[key] = value;
  }
  return values;
}

function parse(formData: FormData) {
  const parsed = entryFormSchema.safeParse(formValues(formData));
  if (parsed.success) return { data: parsed.data };
  return {
    state: {
      message: "Revisa los campos marcados.",
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    } satisfies EntryFormState,
  };
}

export async function createCalendarEntry(
  _prev: EntryFormState,
  formData: FormData,
): Promise<EntryFormState> {
  const parsed = parse(formData);
  if (!parsed.data) return parsed.state;
  const { email } = await getCurrentMember();
  const supabase = await createClient();
  const { error } = await supabase
    .from("calendar_entries")
    .insert({ ...parsed.data, member_email: email });
  if (error) return saveError(error);
  revalidatePath(CALENDAR_PATH);
  return { ok: true };
}

export async function updateCalendarEntry(
  id: string,
  _prev: EntryFormState,
  formData: FormData,
): Promise<EntryFormState> {
  if (!z.uuid().safeParse(id).success) return { message: "Entrada no encontrada." };
  const parsed = parse(formData);
  if (!parsed.data) return parsed.state;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("calendar_entries")
    .update(parsed.data)
    .eq("id", id)
    .select("id");
  if (error) return saveError(error);
  if (!data?.length) return { message: "No se pudo guardar la entrada. Inténtalo de nuevo." };
  revalidatePath(CALENDAR_PATH);
  return { ok: true };
}

export async function deleteCalendarEntry(id: string): Promise<ActionResult> {
  if (!z.uuid().safeParse(id).success) {
    return { ok: false, message: "Entrada no encontrada." };
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("calendar_entries")
    .delete()
    .eq("id", id)
    .select("id");
  if (error || !data?.length) {
    return { ok: false, message: "No se pudo eliminar la entrada." };
  }
  revalidatePath(CALENDAR_PATH);
  return { ok: true };
}
