export type Attendee = {
  id: string;
  name: string;
  email: string;
  photo_consent: boolean;
  email_consent: boolean;
  checked_in_at: string;
};

// What the public check-in page may know about an event. Nothing else.
export type PublicCheckinEvent = {
  title: string;
  starts_at: string;
  location: string | null;
  checkin_open: boolean;
};

export type Attendance = {
  checkin_token: string;
  checkin_open: boolean;
  expected_attendees: number | null;
  attendees: Attendee[];
};

// State returned by the public check-in server action (useActionState).
export type CheckinFormState = {
  status?: "success";
  message?: string;
  fieldErrors?: Partial<Record<string, string[]>>;
  values?: Record<string, string>;
};
