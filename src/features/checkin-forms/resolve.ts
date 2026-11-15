// Pure helpers for named check-in forms ("templates") and their immutable
// versions. Version numbers are global (unique across all forms) so `?v=N`
// links and `attendees.consent_version` stay unambiguous.

export type FormRef = {
  id: string;
  name: string;
  is_default: boolean;
  archived_at: string | null;
};

type VersionRef = { id: string; form_id: string; version: number };

export type FormSummary = FormRef & {
  latest_version: number | null;
  latest_version_id: string | null;
  version_count: number;
};

function latestOf<V extends VersionRef>(formId: string, versions: V[]): V | null {
  let latest: V | null = null;
  for (const version of versions) {
    if (version.form_id === formId && (!latest || version.version > latest.version)) {
      latest = version;
    }
  }
  return latest;
}

// The version an event's check-in uses: the latest version of the event's
// form (archived forms keep serving the events that already chose them), or
// the default form's latest version when the event has no usable form.
export function resolveCheckinFormVersion<V extends VersionRef>(
  eventFormId: string | null,
  forms: FormRef[],
  versions: V[],
): V | null {
  if (eventFormId && forms.some((form) => form.id === eventFormId)) {
    const own = latestOf(eventFormId, versions);
    if (own) return own;
  }
  const fallback = forms.find((form) => form.is_default);
  return fallback ? latestOf(fallback.id, versions) : null;
}

// Default form first, then by name.
export function summarizeForms(forms: FormRef[], versions: VersionRef[]): FormSummary[] {
  return forms
    .map((form) => {
      const latest = latestOf(form.id, versions);
      return {
        ...form,
        latest_version: latest?.version ?? null,
        latest_version_id: latest?.id ?? null,
        version_count: versions.filter((version) => version.form_id === form.id).length,
      };
    })
    .sort(
      (a, b) =>
        Number(b.is_default) - Number(a.is_default) || a.name.localeCompare(b.name, "es"),
    );
}

// Forms an event may pick: active ones with a published version, plus the
// event's current form so editing never silently drops it.
export function selectableForms(
  forms: FormSummary[],
  currentFormId: string | null,
): FormSummary[] {
  return forms.filter(
    (form) =>
      form.id === currentFormId || (form.archived_at === null && form.version_count > 0),
  );
}
