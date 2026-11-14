import "server-only";
import { createClient } from "@/lib/supabase/server";
import { formFieldsSchema, latestFieldLabels } from "./definition";
import { CHECKIN_FORM_COLUMNS, parseStoredForm } from "./stored";
import type { CheckinFormVersion } from "./types";

// Member reads with the user's session; RLS only returns rows to members.

export async function listCheckinFormVersions(): Promise<CheckinFormVersion[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("checkin_forms")
    .select(CHECKIN_FORM_COLUMNS)
    .order("version", { ascending: false });
  if (error) throw new Error("No se pudieron cargar las versiones del formulario.");
  return data.map(parseStoredForm);
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
