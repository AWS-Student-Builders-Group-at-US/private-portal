export type MemberRow = {
  email: string;
  name: string;
  area: string | null;
  created_at: string;
};

// State returned by the add/edit member server actions (useActionState).
export type MemberFormState = {
  ok?: boolean;
  message?: string;
  fieldErrors?: Partial<Record<string, string[]>>;
  values?: Record<string, string>;
};
