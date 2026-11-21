// A free reminder the member wrote for themself; the daily cron emails it to
// them on `remind_on` and sets `sent_at`.
export type Reminder = {
  id: string;
  title: string;
  note: string | null;
  remind_on: string; // "YYYY-MM-DD" (Madrid)
  sent_at: string | null;
};

export type ReminderFormState = {
  message?: string;
  fieldErrors?: Partial<Record<string, string[]>>;
  ok?: boolean;
};
