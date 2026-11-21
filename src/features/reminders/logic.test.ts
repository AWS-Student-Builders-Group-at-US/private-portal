import { describe, expect, it } from "vitest";
import {
  addDaysIso,
  dueReminders,
  dueTaskReminders,
  groupByRecipient,
  type ReminderRow,
  type ReminderTask,
} from "./logic";

const TODAY = "2026-11-22";

function task(overrides: Partial<ReminderTask> = {}): ReminderTask {
  return {
    id: "t1",
    title: "Preparar charla",
    status: "todo",
    due_date: "2026-11-23",
    email_reminder: true,
    assignee_emails: ["ana@example.com", "bea@example.com"],
    ...overrides,
  };
}

function reminder(overrides: Partial<ReminderRow> = {}): ReminderRow {
  return {
    id: "r1",
    member_email: "ana@example.com",
    title: "Reservar aula",
    note: null,
    remind_on: TODAY,
    sent_at: null,
    ...overrides,
  };
}

describe("addDaysIso", () => {
  it("adds days across month and year boundaries", () => {
    expect(addDaysIso("2026-11-30", 1)).toBe("2026-12-01");
    expect(addDaysIso("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDaysIso("2026-03-01", -1)).toBe("2026-02-28");
  });
});

describe("dueTaskReminders", () => {
  it("reminds every assignee of a ticked task due tomorrow", () => {
    expect(dueTaskReminders([task()], [], TODAY, null)).toEqual([
      { task_id: "t1", member_email: "ana@example.com", due_date: "2026-11-23", title: "Preparar charla" },
      { task_id: "t1", member_email: "bea@example.com", due_date: "2026-11-23", title: "Preparar charla" },
    ]);
  });

  it("also catches tasks due today that were not reminded (late tick or missed run)", () => {
    expect(dueTaskReminders([task({ due_date: TODAY })], [], TODAY, null)).toHaveLength(2);
  });

  it("skips tasks without the tick, without a date, done, overdue or due later", () => {
    const tasks = [
      task({ id: "a", email_reminder: false }),
      task({ id: "b", due_date: null }),
      task({ id: "c", status: "done" }),
      task({ id: "d", due_date: "2026-11-21" }),
      task({ id: "e", due_date: "2026-11-24" }),
    ];
    expect(dueTaskReminders(tasks, [], TODAY, null)).toEqual([]);
  });

  it("never sends the same task, assignee and due date twice", () => {
    const sent = [{ task_id: "t1", member_email: "ana@example.com", due_date: "2026-11-23" }];
    expect(dueTaskReminders([task()], sent, TODAY, null).map((r) => r.member_email)).toEqual([
      "bea@example.com",
    ]);
  });

  it("sends again when the due date changed after a reminder", () => {
    const sent = [{ task_id: "t1", member_email: "ana@example.com", due_date: "2026-11-20" }];
    expect(dueTaskReminders([task()], sent, TODAY, null)).toHaveLength(2);
  });

  it("never reminds the common account, whatever its case", () => {
    const tasks = [task({ assignee_emails: ["Grupo@Example.com", "ana@example.com"] })];
    expect(
      dueTaskReminders(tasks, [], TODAY, "grupo@example.com").map((r) => r.member_email),
    ).toEqual(["ana@example.com"]);
  });
});

describe("dueReminders", () => {
  it("returns pending reminders for today", () => {
    expect(dueReminders([reminder()], TODAY, null).map((r) => r.id)).toEqual(["r1"]);
  });

  it("catches up on the last 7 days but not older, future or sent reminders", () => {
    const rows = [
      reminder({ id: "week", remind_on: "2026-11-15" }),
      reminder({ id: "old", remind_on: "2026-11-14" }),
      reminder({ id: "future", remind_on: "2026-11-23" }),
      reminder({ id: "sent", sent_at: "2026-11-22T04:00:00Z" }),
    ];
    expect(dueReminders(rows, TODAY, null).map((r) => r.id)).toEqual(["week"]);
  });

  it("skips the common account", () => {
    expect(
      dueReminders([reminder({ member_email: "grupo@example.com" })], TODAY, "GRUPO@example.com"),
    ).toEqual([]);
  });
});

describe("groupByRecipient", () => {
  it("builds one digest per member with their tasks and reminders", () => {
    const tasks = dueTaskReminders([task()], [], TODAY, null);
    const reminders = dueReminders([reminder()], TODAY, null);
    const groups = groupByRecipient(tasks, reminders);
    expect([...groups.keys()]).toEqual(["ana@example.com", "bea@example.com"]);
    expect(groups.get("ana@example.com")).toMatchObject({
      tasks: [{ task_id: "t1" }],
      reminders: [{ id: "r1" }],
    });
    expect(groups.get("bea@example.com")?.reminders).toEqual([]);
  });
});
