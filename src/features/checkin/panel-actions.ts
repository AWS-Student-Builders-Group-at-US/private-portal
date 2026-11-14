"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/features/events/types";

// Member-only actions: user's session (never the admin client); RLS rejects
// non-members, which we see as "no rows updated/deleted".

const idSchema = z.uuid();
const eventPath = (id: string) => `/panel/eventos/${id}`;

export async function setCheckinOpen(
  eventId: string,
  open: boolean,
): Promise<ActionResult> {
  if (!idSchema.safeParse(eventId).success) {
    return { ok: false, message: "Evento no encontrado." };
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("events")
    .update({ checkin_open: open === true })
    .eq("id", eventId)
    .select("id");
  if (error || !data?.length) {
    return { ok: false, message: "No se pudo cambiar el estado del registro." };
  }
  revalidatePath(eventPath(eventId));
  return { ok: true };
}

// A new token invalidates every printed or shared copy of the old QR.
export async function regenerateCheckinToken(
  eventId: string,
): Promise<ActionResult> {
  if (!idSchema.safeParse(eventId).success) {
    return { ok: false, message: "Evento no encontrado." };
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("events")
    .update({ checkin_token: randomBytes(16).toString("hex") })
    .eq("id", eventId)
    .select("id");
  if (error || !data?.length) {
    return { ok: false, message: "No se pudo regenerar el QR." };
  }
  revalidatePath(eventPath(eventId));
  return { ok: true };
}

export async function deleteAttendee(attendeeId: string): Promise<ActionResult> {
  if (!idSchema.safeParse(attendeeId).success) {
    return { ok: false, message: "Asistente no encontrado." };
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("attendees")
    .delete()
    .eq("id", attendeeId)
    .select("event_id");
  if (error || !data?.length) {
    return { ok: false, message: "No se pudo eliminar el asistente." };
  }
  revalidatePath(eventPath(data[0].event_id));
  return { ok: true };
}
