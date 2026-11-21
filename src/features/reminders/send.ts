import "server-only";
import { createGmailTransport, getMailerConfig, senderAddress } from "@/features/emails/mailer";
import { getCommonAccountEmail } from "@/features/members/common-account";
import { madridToday } from "@/features/tasks/dates";
import { createAdminClient } from "@/lib/supabase/admin";
import { composeReminderEmail } from "./email";
import {
  REMINDER_CATCH_UP_DAYS,
  addDaysIso,
  dueReminders,
  dueTaskReminders,
  groupByRecipient,
  type ReminderRow,
  type ReminderTask,
  type TaskReminderSend,
} from "./logic";

// Daily email reminders, run by the daily cron with the admin client (tasks
// of every member, the server-only task_reminder_sends table, and sent_at on
// reminders). Each item is claimed in the database BEFORE sending (a
// task_reminder_sends row, or sent_at on the reminder), so two runs never
// email it twice; a failed send releases its claims for the next run.
// Never logs or returns addresses, names or content: counts only.

export type ReminderRunResult =
  | { ok: boolean; sent: number; failed: number }
  | "not_configured";

type TaskQueryRow = Omit<ReminderTask, "assignee_emails"> & {
  assignees: { member_email: string }[];
};

export async function sendDailyReminders(now: Date = new Date()): Promise<ReminderRunResult> {
  const config = getMailerConfig();
  if (!config) return "not_configured";
  try {
    const admin = createAdminClient();
    const today = madridToday(now);
    const tomorrow = addDaysIso(today, 1);

    const [tasksRead, remindersRead] = await Promise.all([
      admin
        .from("tasks")
        .select("id, title, status, due_date, email_reminder, assignees:task_assignees(member_email)")
        .eq("email_reminder", true)
        .neq("status", "done")
        .gte("due_date", today)
        .lte("due_date", tomorrow),
      admin
        .from("reminders")
        .select("id, member_email, title, note, remind_on, sent_at")
        .is("sent_at", null)
        .gte("remind_on", addDaysIso(today, -REMINDER_CATCH_UP_DAYS))
        .lte("remind_on", today),
    ]);
    if (tasksRead.error || remindersRead.error) return { ok: false, sent: 0, failed: 0 };

    const tasks = (tasksRead.data as unknown as TaskQueryRow[]).map(({ assignees, ...task }) => ({
      ...task,
      assignee_emails: assignees.map((a) => a.member_email),
    }));
    let sent: TaskReminderSend[] = [];
    if (tasks.length > 0) {
      const { data, error } = await admin
        .from("task_reminder_sends")
        .select("task_id, member_email, due_date")
        .in("task_id", tasks.map((task) => task.id))
        .gte("due_date", today);
      if (error) return { ok: false, sent: 0, failed: 0 };
      sent = data;
    }

    const common = getCommonAccountEmail();
    const digests = groupByRecipient(
      dueTaskReminders(tasks, sent, today, common),
      dueReminders(remindersRead.data as ReminderRow[], today, common),
    );
    if (digests.size === 0) return { ok: true, sent: 0, failed: 0 };

    const { data: members } = await admin
      .from("members")
      .select("email, name")
      .in("email", [...digests.keys()]);
    const names = new Map((members ?? []).map((m) => [m.email as string, m.name as string]));

    const transport = createGmailTransport(config);
    let sentCount = 0;
    let failed = 0;
    try {
      for (const [email, digest] of digests) {
        // Claim first: only what this run inserted or flipped is sent.
        const sendRows = digest.tasks.map(({ task_id, member_email, due_date }) => ({
          task_id,
          member_email,
          due_date,
        }));
        const claimedTasks = sendRows.length
          ? await admin
              .from("task_reminder_sends")
              .upsert(sendRows, {
                onConflict: "task_id,member_email,due_date",
                ignoreDuplicates: true,
              })
              .select("task_id")
          : { data: [], error: null };
        const reminderIds = digest.reminders.map((r) => r.id);
        const claimedReminders = reminderIds.length
          ? await admin
              .from("reminders")
              .update({ sent_at: new Date().toISOString() })
              .in("id", reminderIds)
              .is("sent_at", null)
              .select("id")
          : { data: [], error: null };
        if (claimedTasks.error || claimedReminders.error) {
          failed += 1;
          continue;
        }
        const taskIds = new Set((claimedTasks.data ?? []).map((row) => row.task_id as string));
        const remIds = new Set((claimedReminders.data ?? []).map((row) => row.id as string));
        const tasksToSend = digest.tasks.filter((t) => taskIds.has(t.task_id));
        const remindersToSend = digest.reminders.filter((r) => remIds.has(r.id));
        if (tasksToSend.length + remindersToSend.length === 0) continue;

        const message = composeReminderEmail({
          name: names.get(email) ?? "",
          tasks: tasksToSend,
          reminders: remindersToSend,
          today,
          panelUrl: `${config.siteUrl.replace(/\/+$/, "")}/panel`,
        });
        try {
          await transport.sendMail({ from: senderAddress(config.user), to: email, ...message });
          sentCount += 1;
        } catch {
          failed += 1;
          // Release the claims so the next run tries again.
          await Promise.all([
            tasksToSend.length
              ? admin
                  .from("task_reminder_sends")
                  .delete()
                  .eq("member_email", email)
                  .in("task_id", tasksToSend.map((t) => t.task_id))
                  .gte("due_date", today)
              : null,
            remindersToSend.length
              ? admin
                  .from("reminders")
                  .update({ sent_at: null })
                  .in("id", remindersToSend.map((r) => r.id))
              : null,
          ]);
        }
      }
    } finally {
      transport.close();
    }
    return { ok: failed === 0, sent: sentCount, failed };
  } catch {
    // Missing configuration or network failure: report, never throw.
    return { ok: false, sent: 0, failed: 0 };
  }
}
