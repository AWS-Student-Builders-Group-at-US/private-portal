"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentMember } from "@/lib/auth/member";
import { createClient } from "@/lib/supabase/server";
import { MAX_FEEDS_PER_MEMBER } from "./queries";
import { refreshBusyBlocks } from "./refresh";
import { googleIcalUrlSchema } from "./url";

// Feed rows are written with the member's session (RLS: own rows only). Busy
// blocks are written by refreshBusyBlocks with the secret key.

const PROFILE_PATH = "/panel/perfil";

export type FeedFormState = {
  message?: string;
  fieldErrors?: Partial<Record<string, string[]>>;
  values?: { label?: string };
  ok?: boolean;
};

export type CalendarActionResult = { ok: true } | { ok: false; message: string };

const feedFormSchema = z.object({
  label: z
    .string()
    .trim()
    .min(1, "Escribe un nombre.")
    .max(60, "Máximo 60 caracteres."),
  ics_url: googleIcalUrlSchema,
});

export async function addCalendarFeed(
  _prev: FeedFormState,
  formData: FormData,
): Promise<FeedFormState> {
  const label = String(formData.get("label") ?? "");
  const parsed = feedFormSchema.safeParse({
    label,
    ics_url: String(formData.get("ics_url") ?? ""),
  });
  if (!parsed.success) {
    return {
      message: "Revisa los campos marcados.",
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
      values: { label },
    };
  }

  const member = await getCurrentMember();
  const supabase = await createClient();
  const { count } = await supabase
    .from("calendar_feeds")
    .select("id", { count: "exact", head: true });
  if ((count ?? 0) >= MAX_FEEDS_PER_MEMBER) {
    return {
      message: `Puedes conectar como máximo ${MAX_FEEDS_PER_MEMBER} calendarios.`,
      values: { label },
    };
  }

  const { error } = await supabase.from("calendar_feeds").insert({
    member_email: member.email,
    label: parsed.data.label,
    ics_url: parsed.data.ics_url,
  });
  if (error) {
    return { message: "No se pudo guardar el calendario.", values: { label } };
  }

  await refreshBusyBlocks(member.email);
  revalidatePath(PROFILE_PATH);
  return { ok: true, message: "Calendario añadido." };
}

export async function deleteCalendarFeed(id: string): Promise<CalendarActionResult> {
  if (!z.uuid().safeParse(id).success) {
    return { ok: false, message: "Calendario no encontrado." };
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("calendar_feeds")
    .delete()
    .eq("id", id)
    .select("id");
  if (error || !data?.length) {
    return { ok: false, message: "No se pudo eliminar el calendario." };
  }
  revalidatePath(PROFILE_PATH);
  return { ok: true };
}

export async function refreshMyCalendars(): Promise<CalendarActionResult> {
  const member = await getCurrentMember();
  await refreshBusyBlocks(member.email);
  revalidatePath(PROFILE_PATH);
  return { ok: true };
}

export async function regenerateExportToken(): Promise<CalendarActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("regenerate_calendar_export_token");
  if (error) return { ok: false, message: "No se pudo regenerar el enlace." };
  revalidatePath(PROFILE_PATH);
  return { ok: true };
}
