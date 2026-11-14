"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  buildAnswersSchema,
  readFormValues,
  toAttendeeColumns,
} from "@/features/checkin-forms/answers";
import type { PublicCheckinForm } from "@/features/checkin-forms/types";
import { getActiveCheckinForm } from "./form-queries";
import { getCheckinEventByToken } from "./queries";
import {
  CHECKIN_WINDOW_SECONDS,
  getClientIp,
  hashIp,
  isRateLimited,
} from "./rate-limit";
import type { CheckinFormState } from "./types";

// Public action (no session). It uses the admin client, so every input is
// validated here and the only write is one attendee row for an OPEN event.
// Messages never reveal other attendees' data.

const GENERIC_ERROR = "No se pudo registrar la asistencia. Inténtalo de nuevo.";
const FORM_CHANGED =
  "El formulario y sus condiciones se han actualizado. Revísalos y vuelve a enviarlo.";
const UNIQUE_VIOLATION = "23505";

export async function submitCheckin(
  token: string,
  _prev: CheckinFormState,
  formData: FormData,
): Promise<CheckinFormState> {
  const [event, form] = await Promise.all([
    getCheckinEventByToken(token).catch(() => null),
    getActiveCheckinForm().catch(() => null),
  ]);
  if (!event || !form) return { message: GENERIC_ERROR };
  const values = readFormValues(form.fields, formData);
  if (!event.checkin_open) {
    return { message: "El registro de asistencia está cerrado.", values };
  }

  // The attendee must accept the version they saw. If it changed since the
  // page was rendered, show the new one instead of saving.
  if (formData.get("form_version_id") !== form.id) {
    const publicForm: PublicCheckinForm = {
      id: form.id,
      version: form.version,
      title: form.title,
      intro: form.intro,
      fields: form.fields,
    };
    return { message: FORM_CHANGED, values, form: publicForm };
  }

  const parsed = buildAnswersSchema(form.fields).safeParse(values);
  if (!parsed.success) {
    return {
      message: "Revisa los campos marcados.",
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
      values,
    };
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
    ...toAttendeeColumns(parsed.data),
    form_version_id: form.id,
    consent_version: String(form.version),
  });
  if (error?.code === UNIQUE_VIOLATION) {
    return { status: "success", message: "Ya estabas registrado en este evento." };
  }
  if (error) return { message: GENERIC_ERROR, values };
  return { status: "success" };
}
