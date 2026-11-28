export type MemberRow = {
  email: string;
  name: string;
  area: string | null;
  created_at: string;
  // May create and manage group meetings (set by the common account).
  can_schedule_meetings: boolean;
};

// State returned by the add/edit member server actions (useActionState).
export type MemberFormState = {
  ok?: boolean;
  message?: string;
  fieldErrors?: Partial<Record<string, string[]>>;
  values?: Record<string, string>;
};
