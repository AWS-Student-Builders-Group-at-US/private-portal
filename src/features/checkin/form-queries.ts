import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { CHECKIN_FORM_COLUMNS, parseStoredForm } from "@/features/checkin-forms/stored";
import type { CheckinFormVersion } from "@/features/checkin-forms/types";

// Public reads (no session) of check-in form versions for /checkin/<token>
// and /privacidad. Admin client: `checkin_forms` has no anon policy.

export async function getActiveCheckinForm(): Promise<CheckinFormVersion | null> {
  const { data, error } = await createAdminClient()
    .from("checkin_forms")
    .select(CHECKIN_FORM_COLUMNS)
    .eq("is_active", true)
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
