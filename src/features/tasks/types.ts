import type { TaskPriority, TaskStatus } from "./schema";

export type Task = {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  // First assignee, kept for older code; use `assignee_emails`.
  assignee_email: string | null;
  assignee_emails: string[];
  due_date: string | null; // "YYYY-MM-DD"
  event_id: string | null;
  priority: TaskPriority | null;
  link_url: string | null;
  // "Recordarme por correo": assignees get an email the day before due_date.
  email_reminder: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
};

// Task as shown on the board, with display names already resolved.
export type TaskCardData = Task & {
  assignees: { email: string; name: string }[];
  event_title: string | null;
};

export type MemberOption = { email: string; name: string };
export type EventOption = { id: string; title: string };

export type TaskFormState = {
  message?: string;
  fieldErrors?: Partial<Record<string, string[]>>;
  values?: Record<string, string>;
};
