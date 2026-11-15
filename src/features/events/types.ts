export type EventSummary = {
  id: string;
  title: string;
  starts_at: string;
  ends_at: string | null;
  location: string | null;
  expected_attendees: number | null;
  file_count: number;
};

export type EventDetail = {
  id: string;
  title: string;
  description: string | null;
  starts_at: string;
  ends_at: string | null;
  location: string | null;
  meetup_url: string | null;
  expected_attendees: number | null;
  is_public: boolean;
  // Named check-in form; null = the default form.
  checkin_form_id: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export type EventFile = {
  id: string;
  file_name: string;
  size_bytes: number | null;
  content_type: string | null;
  uploaded_by: string;
  created_at: string;
};

// State returned by the event form server actions (useActionState).
export type EventFormState = {
  message?: string;
  fieldErrors?: Partial<Record<string, string[]>>;
  values?: Record<string, string>;
};

// Result of the small file/delete server actions.
export type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; message: string };
