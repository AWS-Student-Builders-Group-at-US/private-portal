import type { SuggestionStatus } from "./schema";

export type Suggestion = {
  id: string;
  body: string;
  status: SuggestionStatus;
  author_name: string | null; // null = anonymous (or author no longer a member)
  created_at: string;
  votes: number;
  voted_by_me: boolean;
};

export type SuggestionFormState = {
  message?: string;
  fieldErrors?: Partial<Record<string, string[]>>;
  values?: Record<string, string>;
  ok?: boolean;
};
