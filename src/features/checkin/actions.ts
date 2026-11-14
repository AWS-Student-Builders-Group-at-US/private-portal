"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCheckinEventByToken } from "./queries";
import {
  CHECKIN_WINDOW_SECONDS,
  getClientIp,
  hashIp,
  isRateLimited,
} from "./rate-limit";
import { PRIVACY_NOTICE_VERSION, checkinFormSchema } from "./schema";
import type { CheckinFormState } from "./types";

// Public action (no session). It uses the admin client, so every input is
// validated here and the only write is one attendee row for an OPEN event.
// Messages never reveal other attendees' data.

const GENERIC_ERROR = "No se pudo registrar la asistencia. Inténtalo de nuevo.";
const UNIQUE_VIOLATION = "23505";

export async function submitCheckin(
  token: string,
  _prev: CheckinFormState,
  formData: FormData,
): Promise<CheckinFormState> {
  const values = {
    name: String(formData.get("name") ?? ""),
    email: String(formData.get("email") ?? ""),
    photo_consent: formData.get("photo_consent") === "on" ? "on" : "",
    email_consent: formData.get("email_consent") === "on" ? "on" : "",
  };
  const parsed = checkinFormSchema.safeParse(values);
  if (!parsed.success) {
    return {
      message: "Revisa los campos marcados.",
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
      values,
    };
  }

  const event = await getCheckinEventByToken(token).catch(() => null);
  if (!event) return { message: GENERIC_ERROR, values };
  if (!event.checkin_open) {
    return { message: "El registro de asistencia está cerrado.", values };
  }

  const salt = process.env.CHECKIN_IP_SALT;
  if (!salt) throw new Error("Missing CHECKIN_IP_SALT");
  const ipHash = hashIp(getClientIp(await headers()), salt);
  const supabase = createAdminClient();

  const since = new Date(Date.now() - CHECKIN_WINDOW_SECONDS * 1000);
  const { count, error: countError } = await supabase
    .from("checkin_attempts")
    .select("id", { count: "exact", head: true })
    .eq("ip_hash", ipHash)
    .gte("created_at", since.toISOString());
  if (countError) return { message: GENERIC_ERROR, values };
  if (isRateLimited(count ?? 0)) {
    return {
      message: "Demasiados intentos. Espera un minuto y vuelve a intentarlo.",
      values,
    };
  }
  const { error: attemptError } = await supabase
    .from("checkin_attempts")
    .insert({ ip_hash: ipHash });
  if (attemptError) return { message: GENERIC_ERROR, values };

  const { error } = await supabase.from("attendees").insert({
    event_id: event.id,
    ...parsed.data,
    consent_version: PRIVACY_NOTICE_VERSION,
  });
  if (error?.code === UNIQUE_VIOLATION) {
    return { status: "success", message: "Ya estabas registrado en este evento." };
  }
  if (error) return { message: GENERIC_ERROR, values };
  return { status: "success" };
}
