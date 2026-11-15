import "server-only";
import { createClient } from "@/lib/supabase/server";
import { formFieldsSchema, latestFieldLabels } from "./definition";
import { selectableForms, summarizeForms, type FormRef, type FormSummary } from "./resolve";
import { CHECKIN_FORM_COLUMNS, parseStoredForm } from "./stored";
import type { CheckinFormVersion } from "./types";

// Member reads with the user's session; RLS only returns rows to members.

const TEMPLATE_COLUMNS = "id, name, is_default, archived_at";

// Every named form with its latest version and version count.
export async function listCheckinForms(): Promise<FormSummary[]> {
  const supabase = await createClient();
  const [templates, versions] = await Promise.all([
    supabase.from("checkin_form_templates").select(TEMPLATE_COLUMNS),
    supabase.from("checkin_forms").select("id, form_id, version"),
  ]);
  if (templates.error || versions.error) {
    throw new Error("No se pudieron cargar los formularios.");
  }
  return summarizeForms(templates.data as FormRef[], versions.data);
}

// Options for the event form's "Formulario de registro" select.
export async function getEventFormOptions(currentFormId: string | null) {
  const forms = await listCheckinForms();
  return {
    formOptions: selectableForms(forms, currentFormId).map((form) => ({
      id: form.id,
      name: form.name,
      archived: form.archived_at !== null,
    })),
    defaultFormName: forms.find((form) => form.is_default)?.name ?? null,
  };
}

// One named form with its versions, newest first.
export async function getCheckinForm(
  id: string,
): Promise<{ form: FormRef; versions: CheckinFormVersion[] } | null> {
  const supabase = await createClient();
  const { data: form, error } = await supabase
    .from("checkin_form_templates")
    .select(TEMPLATE_COLUMNS)
    .eq("id", id)
    .maybeSingle();
  // An invalid uuid is a "not found", not a server error.
  if (error || !form) return null;
  const { data, error: versionsError } = await supabase
    .from("checkin_forms")
    .select(CHECKIN_FORM_COLUMNS)
    .eq("form_id", id)
    .order("version", { ascending: false });
  if (versionsError) throw new Error("No se pudieron cargar las versiones del formulario.");
  return { form: form as FormRef, versions: data.map(parseStoredForm) };
}

// Latest version of the default form (starting point for a new form).
export async function getDefaultFormLatestVersion(): Promise<CheckinFormVersion | null> {
  const supabase = await createClient();
  const { data: form } = await supabase
    .from("checkin_form_templates")
    .select("id")
    .eq("is_default", true)
    .maybeSingle();
  if (!form) return null;
  const { data } = await supabase
    .from("checkin_forms")
    .select(CHECKIN_FORM_COLUMNS)
    .eq("form_id", form.id)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data ? parseStoredForm(data) : null;
}

// Version numbers by id and labels for extra answer keys (all versions).
export async function getFormVersionIndex() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("checkin_forms")
    .select("id, version, fields");
  if (error) return null;
  const versions = data.map((row) => ({
    id: row.id as string,
    version: row.version as number,
    fields: formFieldsSchema.catch([]).parse(row.fields),
  }));
  const versionById: Record<string, number> = Object.fromEntries(
    versions.map((v) => [v.id, v.version]),
  );
  return { versionById, labels: latestFieldLabels(versions) };
}
