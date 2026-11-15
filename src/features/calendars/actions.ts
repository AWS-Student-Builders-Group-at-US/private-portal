"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentMember } from "@/lib/auth/member";
import { createClient } from "@/lib/supabase/server";
import { MAX_FEEDS_PER_MEMBER } from "./queries";
import { refreshBusyBlocks } from "./refresh";
import { googleIcalUrlSchema } from "./url";

// Form values "1" / "0.5" (also accepts numbers) -> 1 | 0.5.
const feedWeightSchema = z
  .union([z.literal(["1", "0.5"]), z.literal([1, 0.5])], "Elige una importancia.")
  .transform((value) => (Number(value) === 0.5 ? 0.5 : 1));

// Feed rows are written with the member's session (RLS: own rows only). Busy
// blocks are written by refreshBusyBlocks with the secret key.

// Calendars are managed from "Mi disponibilidad" (/panel/calendario).
const CALENDAR_PATH = "/panel/calendario";

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
  weight: feedWeightSchema,
});

export async function addCalendarFeed(
  _prev: FeedFormState,
  formData: FormData,
): Promise<FeedFormState> {
  const label = String(formData.get("label") ?? "");
  const parsed = feedFormSchema.safeParse({
    label,
    ics_url: String(formData.get("ics_url") ?? ""),
    weight: String(formData.get("weight") ?? "1"),
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
    weight: parsed.data.weight,
  });
  if (error) {
    return { message: "No se pudo guardar el calendario.", values: { label } };
  }

  await refreshBusyBlocks(member.email);
  revalidatePath(CALENDAR_PATH);
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
  revalidatePath(CALENDAR_PATH);
  return { ok: true };
}

// Changes a feed's importance; a database trigger copies it to the feed's
// stored busy blocks.
export async function setCalendarFeedWeight(
  id: string,
  weight: unknown,
): Promise<CalendarActionResult> {
  const parsedWeight = feedWeightSchema.safeParse(weight);
  if (!z.uuid().safeParse(id).success || !parsedWeight.success) {
    return { ok: false, message: "No se pudo cambiar la importancia." };
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("calendar_feeds")
    .update({ weight: parsedWeight.data })
    .eq("id", id)
    .select("id");
  if (error || !data?.length) {
    return { ok: false, message: "No se pudo cambiar la importancia." };
  }
  revalidatePath(CALENDAR_PATH);
  return { ok: true };
}

export async function refreshMyCalendars(): Promise<CalendarActionResult> {
  const member = await getCurrentMember();
  await refreshBusyBlocks(member.email);
  revalidatePath(CALENDAR_PATH);
  return { ok: true };
}

export async function regenerateExportToken(): Promise<CalendarActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("regenerate_calendar_export_token");
  if (error) return { ok: false, message: "No se pudo regenerar el enlace." };
  revalidatePath(CALENDAR_PATH);
  return { ok: true };
}
