export type Link = {
  id: string;
  title: string;
  url: string;
  category: string | null;
  notes: string | null;
  created_by: string;
  created_at: string;
};

export type LinkFormState = {
  message?: string;
  fieldErrors?: Partial<Record<string, string[]>>;
  values?: Record<string, string>;
};
