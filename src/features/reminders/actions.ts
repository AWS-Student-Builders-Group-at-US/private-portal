"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { ActionResult } from "@/features/events/types";
import { madridToday } from "@/features/tasks/dates";
import { getCurrentMember } from "@/lib/auth/member";
import { createClient } from "@/lib/supabase/server";
import { reminderFormSchema } from "./schema";
import type { ReminderFormState } from "./types";

// Every action runs with the user's session; RLS only lets members read and
// write their own reminders (sent_at is set by the daily cron only).

const HOME_PATH = "/panel";

function parse(formData: FormData) {
  const values: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string" && !key.startsWith("$")) values[key] = value;
  }
  const parsed = reminderFormSchema(madridToday()).safeParse(values);
  if (parsed.success) return { data: parsed.data };
  return {
    state: {
      message: "Revisa los campos marcados.",
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    } satisfies ReminderFormState,
  };
}

export async function createReminder(
  _prev: ReminderFormState,
  formData: FormData,
): Promise<ReminderFormState> {
  const parsed = parse(formData);
  if (!parsed.data) return parsed.state;
  const { email } = await getCurrentMember();
  const supabase = await createClient();
  const { error } = await supabase.from("reminders").insert({ ...parsed.data, member_email: email });
  if (error) return { message: "No se pudo guardar el recordatorio. Inténtalo de nuevo." };
  revalidatePath(HOME_PATH);
  return { ok: true };
}

// Changing the date makes a sent reminder pending again (database trigger).
export async function updateReminder(
  id: string,
  _prev: ReminderFormState,
  formData: FormData,
): Promise<ReminderFormState> {
  if (!z.uuid().safeParse(id).success) return { message: "Recordatorio no encontrado." };
  const parsed = parse(formData);
  if (!parsed.data) return parsed.state;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("reminders")
    .update(parsed.data)
    .eq("id", id)
    .select("id");
  if (error || !data?.length) {
    return { message: "No se pudo guardar el recordatorio. Inténtalo de nuevo." };
  }
  revalidatePath(HOME_PATH);
  return { ok: true };
}

export async function deleteReminder(id: string): Promise<ActionResult> {
  if (!z.uuid().safeParse(id).success) {
    return { ok: false, message: "Recordatorio no encontrado." };
  }
  const supabase = await createClient();
  const { data, error } = await supabase.from("reminders").delete().eq("id", id).select("id");
  if (error || !data?.length) {
    return { ok: false, message: "No se pudo eliminar el recordatorio." };
  }
  revalidatePath(HOME_PATH);
  return { ok: true };
}
