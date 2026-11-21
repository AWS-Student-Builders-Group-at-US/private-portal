// A personal calendar entry a member added by hand in the portal (not an
// event of /panel/eventos, and never data from Google: Google stays
// busy-only). Read through public.list_calendar_entries(), which returns
// title and notes as null for someone else's busy-only entry.
export type EntryVisibility = "details" | "busy";

export type CalendarEntry = {
  id: string;
  member_email: string;
  title: string | null;
  notes: string | null;
  starts_at: string;
  ends_at: string;
  visibility: EntryVisibility;
  is_group_meeting: boolean;
  // The signed-in member owns the entry.
  is_own: boolean;
};

export type EntryFormState = {
  message?: string;
  fieldErrors?: Partial<Record<string, string[]>>;
  ok?: boolean;
};
