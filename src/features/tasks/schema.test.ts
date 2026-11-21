import { describe, expect, it } from "vitest";
import { MAX_ASSIGNEES, taskFormSchema, taskRow, taskStatusSchema } from "./schema";

const EVENT_ID = "0b6f3f3e-5d0a-4c1e-9a43-6f1f2a3b4c5d";

const valid = {
  title: "  Reservar aula  ",
  description: "Pedir el aula A0.10 a conserjería.",
  status: "doing",
  assignee_emails: ["Persona@Example.com ", "otra@example.com", "persona@example.com"],
  due_date: "2026-11-20",
  event_id: EVENT_ID,
};

function issuePaths(input: Record<string, unknown>) {
  const result = taskFormSchema.safeParse(input);
  expect(result.success).toBe(false);
  return result.error!.issues.map((issue) => issue.path.join("."));
}

describe("taskFormSchema", () => {
  it("parses a valid task into a database row", () => {
    const result = taskFormSchema.safeParse(valid);
    expect(result.success).toBe(true);
    expect(result.data).toEqual({
      title: "Reservar aula",
      description: "Pedir el aula A0.10 a conserjería.",
      status: "doing",
      assignee_emails: ["persona@example.com", "otra@example.com"],
      due_date: "2026-11-20",
      event_id: EVENT_ID,
    });
  });

  it("keeps the first assignee in the tasks row", () => {
    const row = taskRow(taskFormSchema.parse(valid));
    expect(row.assignee_email).toBe("persona@example.com");
    expect(row).not.toHaveProperty("assignee_emails");
    expect(taskRow(taskFormSchema.parse({ title: "Algo" })).assignee_email).toBeNull();
  });

  it("accepts a single assignee and caps the list", () => {
    expect(
      taskFormSchema.parse({ title: "Algo", assignee_emails: "a@example.com" }).assignee_emails,
    ).toEqual(["a@example.com"]);
    const many = Array.from({ length: MAX_ASSIGNEES + 1 }, (_, i) => `p${i}@example.com`);
    expect(issuePaths({ ...valid, assignee_emails: many })).toContain("assignee_emails");
  });

  it("requires a title", () => {
    expect(issuePaths({ ...valid, title: "  " })).toContain("title");
  });

  it("rejects a title longer than 200 characters", () => {
    expect(issuePaths({ ...valid, title: "a".repeat(201) })).toContain("title");
  });

  it("defaults the status to todo", () => {
    const result = taskFormSchema.safeParse({ title: "Algo" });
    expect(result.success).toBe(true);
    expect(result.data?.status).toBe("todo");
  });

  it("rejects an unknown status", () => {
    expect(issuePaths({ ...valid, status: "blocked" })).toContain("status");
  });

  it("rejects an invalid assignee email", () => {
    expect(issuePaths({ ...valid, assignee_emails: ["nadie"] })).toContain(
      "assignee_emails.0",
    );
  });

  it("rejects impossible due dates", () => {
    expect(issuePaths({ ...valid, due_date: "2026-02-30" })).toContain("due_date");
    expect(issuePaths({ ...valid, due_date: "20/11/2026" })).toContain("due_date");
  });

  it("rejects an invalid event id", () => {
    expect(issuePaths({ ...valid, event_id: "123" })).toContain("event_id");
  });

  it("turns empty optional fields into null", () => {
    const result = taskFormSchema.safeParse({
      title: "Algo",
      description: " ",
      status: "todo",
      assignee_emails: [""],
      due_date: "",
      event_id: "",
    });
    expect(result.success).toBe(true);
    expect(result.data).toEqual({
      title: "Algo",
      description: null,
      status: "todo",
      assignee_emails: [],
      due_date: null,
      event_id: null,
    });
  });
});

describe("taskStatusSchema", () => {
  it("accepts the four board columns only", () => {
    expect(taskStatusSchema.safeParse("todo").success).toBe(true);
    expect(taskStatusSchema.safeParse("doing").success).toBe(true);
    expect(taskStatusSchema.safeParse("review").success).toBe(true);
    expect(taskStatusSchema.safeParse("done").success).toBe(true);
    expect(taskStatusSchema.safeParse("archived").success).toBe(false);
  });
});
