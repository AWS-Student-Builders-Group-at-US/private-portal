// Pure rules for the daily email reminders (no I/O). All dates are Madrid
// calendar dates "YYYY-MM-DD"; `today` comes from madridToday().

// A task as the cron reads it, with its assignees' emails.
export type ReminderTask = {
  id: string;
  title: string;
  status: string;
  due_date: string | null;
  email_reminder: boolean;
  assignee_emails: string[];
};

// A row of public.task_reminder_sends.
export type TaskReminderSend = { task_id: string; member_email: string; due_date: string };

export type TaskReminderItem = TaskReminderSend & { title: string };

// A row of public.reminders.
export type ReminderRow = {
  id: string;
  member_email: string;
  title: string;
  note: string | null;
  remind_on: string;
  sent_at: string | null;
};

// Missed cron runs still deliver reminders this many days late; older ones
// are dropped instead of arriving as stale surprises.
export const REMINDER_CATCH_UP_DAYS = 7;

export function addDaysIso(date: string, days: number) {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

const normalize = (email: string) => email.trim().toLowerCase();

const sendKey = (send: TaskReminderSend) =>
  `${send.task_id}|${normalize(send.member_email)}|${send.due_date}`;

// Assignees to email about ticked, unfinished tasks due tomorrow (the normal
// "24 h before" case) or today (ticked late, or a missed cron run). A
// (task, assignee, due date) already in `sent` is never sent again; a new
// due date allows one new reminder. `excluded` is the common account.
export function dueTaskReminders(
  tasks: ReminderTask[],
  sent: TaskReminderSend[],
  today: string,
  excluded: string | null,
): TaskReminderItem[] {
  const window = new Set([today, addDaysIso(today, 1)]);
  const alreadySent = new Set(sent.map(sendKey));
  const skip = excluded ? normalize(excluded) : null;
  const items: TaskReminderItem[] = [];
  for (const task of tasks) {
    if (!task.email_reminder || task.status === "done") continue;
    if (!task.due_date || !window.has(task.due_date)) continue;
    for (const email of new Set(task.assignee_emails.map(normalize))) {
      if (email === skip) continue;
      const item = { task_id: task.id, member_email: email, due_date: task.due_date };
      if (alreadySent.has(sendKey(item))) continue;
      items.push({ ...item, title: task.title });
    }
  }
  return items;
}

// Free reminders not yet sent whose date is today or within the catch-up
// window. `excluded` is the common account.
export function dueReminders(
  rows: ReminderRow[],
  today: string,
  excluded: string | null,
): ReminderRow[] {
  const oldest = addDaysIso(today, -REMINDER_CATCH_UP_DAYS);
  const skip = excluded ? normalize(excluded) : null;
  return rows.filter(
    (row) =>
      row.sent_at === null &&
      row.remind_on <= today &&
      row.remind_on >= oldest &&
      normalize(row.member_email) !== skip,
  );
}

export type ReminderDigest = { tasks: TaskReminderItem[]; reminders: ReminderRow[] };

// One email per member, in first-seen order.
export function groupByRecipient(
  tasks: TaskReminderItem[],
  reminders: ReminderRow[],
): Map<string, ReminderDigest> {
  const groups = new Map<string, ReminderDigest>();
  const digest = (email: string) => {
    const key = normalize(email);
    let group = groups.get(key);
    if (!group) {
      group = { tasks: [], reminders: [] };
      groups.set(key, group);
    }
    return group;
  };
  for (const item of tasks) digest(item.member_email).tasks.push(item);
  for (const row of reminders) digest(row.member_email).reminders.push(row);
  return groups;
}
