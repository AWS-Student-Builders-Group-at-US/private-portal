import { formFieldsSchema } from "./definition";
import type { CheckinFormVersion } from "./types";

export const CHECKIN_FORM_COLUMNS =
  "id, version, title, intro, fields, privacy_notice, is_active, created_by, created_at";

// Rows come from jsonb: re-validate the definition before rendering it.
export function parseStoredForm(row: Record<string, unknown>): CheckinFormVersion {
  const fields = formFieldsSchema.safeParse(row.fields);
  if (!fields.success) throw new Error("Definición de formulario no válida.");
  return { ...(row as Omit<CheckinFormVersion, "fields">), fields: fields.data };
}
