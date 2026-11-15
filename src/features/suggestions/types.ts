import type { SuggestionStatus } from "./schema";

export type Suggestion = {
  id: string;
  body: string;
  status: SuggestionStatus;
  author_name: string | null; // null = the author is no longer a member (or a legacy anonymous row)
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
