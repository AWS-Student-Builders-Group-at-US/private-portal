import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveCheckinFormVersion, type FormRef } from "@/features/checkin-forms/resolve";
import { CHECKIN_FORM_COLUMNS, parseStoredForm } from "@/features/checkin-forms/stored";
import type { CheckinFormVersion } from "@/features/checkin-forms/types";

// Public reads (no session) of check-in form versions for /checkin/<token>
// and /privacidad. Admin client: the form tables have no anon policy.

type VersionRow = { id: string; form_id: string; version: number };

async function loadTemplates(): Promise<FormRef[]> {
  const { data, error } = await createAdminClient()
    .from("checkin_form_templates")
    .select("id, name, is_default, archived_at");
  if (error) throw new Error("No se pudo cargar el formulario.");
  return data as FormRef[];
}

async function getVersionById(id: string): Promise<CheckinFormVersion | null> {
  const { data, error } = await createAdminClient()
    .from("checkin_forms")
    .select(CHECKIN_FORM_COLUMNS)
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error("No se pudo cargar el formulario.");
  return data ? parseStoredForm(data) : null;
}

// The version an event's check-in uses: latest version of the event's form,
// or of the default form when the event has none (see resolve.ts).
export async function getCheckinFormForEvent(
  eventFormId: string | null,
): Promise<CheckinFormVersion | null> {
  const templates = await loadTemplates();
  const candidates = templates
    .filter((form) => form.is_default || form.id === eventFormId)
    .map((form) => form.id);
  if (candidates.length === 0) return null;
  const { data, error } = await createAdminClient()
    .from("checkin_forms")
    .select("id, form_id, version")
    .in("form_id", candidates);
  if (error) throw new Error("No se pudo cargar el formulario.");
  const version = resolveCheckinFormVersion(eventFormId, templates, data as VersionRow[]);
  return version ? getVersionById(version.id) : null;
}

// Latest version of one named form (`/privacidad?f=<id>`).
export async function getLatestVersionOfForm(
  formId: string,
): Promise<CheckinFormVersion | null> {
  const { data, error } = await createAdminClient()
    .from("checkin_forms")
    .select(CHECKIN_FORM_COLUMNS)
    .eq("form_id", formId)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error("No se pudo cargar el formulario.");
  return data ? parseStoredForm(data) : null;
}

export async function getCheckinFormByVersion(
  version: number,
): Promise<CheckinFormVersion | null> {
  if (!Number.isSafeInteger(version) || version < 1) return null;
  const { data, error } = await createAdminClient()
    .from("checkin_forms")
    .select(CHECKIN_FORM_COLUMNS)
    .eq("version", version)
    .maybeSingle();
  if (error) throw new Error("No se pudo cargar el formulario.");
  return data ? parseStoredForm(data) : null;
}
