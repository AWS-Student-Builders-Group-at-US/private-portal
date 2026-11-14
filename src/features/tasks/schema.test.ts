import { describe, expect, it } from "vitest";
import { taskFormSchema, taskStatusSchema } from "./schema";

const EVENT_ID = "0b6f3f3e-5d0a-4c1e-9a43-6f1f2a3b4c5d";

const valid = {
  title: "  Reservar aula  ",
  description: "Pedir el aula A0.10 a conserjería.",
  status: "doing",
  assignee_email: "Persona@Example.com ",
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
      assignee_email: "persona@example.com",
      due_date: "2026-11-20",
      event_id: EVENT_ID,
    });
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
    expect(issuePaths({ ...valid, assignee_email: "nadie" })).toContain(
      "assignee_email",
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
      assignee_email: "",
      due_date: "",
      event_id: "",
    });
    expect(result.success).toBe(true);
    expect(result.data).toEqual({
      title: "Algo",
      description: null,
      status: "todo",
      assignee_email: null,
      due_date: null,
      event_id: null,
    });
  });
});

describe("taskStatusSchema", () => {
  it("accepts the three board columns only", () => {
    expect(taskStatusSchema.safeParse("todo").success).toBe(true);
    expect(taskStatusSchema.safeParse("doing").success).toBe(true);
    expect(taskStatusSchema.safeParse("done").success).toBe(true);
    expect(taskStatusSchema.safeParse("archived").success).toBe(false);
  });
});
