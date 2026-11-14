import type { TaskStatus } from "./schema";

export type Task = {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  assignee_email: string | null;
  due_date: string | null; // "YYYY-MM-DD"
  event_id: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
};

// Task as shown on the board, with display names already resolved.
export type TaskCardData = Task & {
  assignee_name: string | null;
  event_title: string | null;
};

export type MemberOption = { email: string; name: string };
export type EventOption = { id: string; title: string };

export type TaskFormState = {
  message?: string;
  fieldErrors?: Partial<Record<string, string[]>>;
  values?: Record<string, string>;
};
