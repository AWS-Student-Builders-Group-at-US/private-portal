import { describe, expect, it } from "vitest";
import {
  filterTasks,
  groupByStatus,
  isOverdue,
  parseTaskFilters,
  sortTasks,
} from "./filters";

type T = {
  id: string;
  status: "todo" | "doing" | "review" | "done";
  assignee_emails: string[];
  event_id: string | null;
  due_date: string | null;
  created_at: string;
};

const ME = "yo@example.com";
const OTHER = "otra@example.com";
const EVENT_A = "0b6f3f3e-5d0a-4c1e-9a43-6f1f2a3b4c5d";
const EVENT_B = "1c7a4f4e-6e1b-4d2f-8b54-7a2a3b4c5d6e";

const task = (overrides: Partial<T>): T => ({
  id: "x",
  status: "todo",
  assignee_emails: [],
  event_id: null,
  due_date: null,
  created_at: "2026-11-14T10:00:00Z",
  ...overrides,
});

const tasks: T[] = [
  task({ id: "1", assignee_emails: [ME], event_id: EVENT_A }),
  task({ id: "2", assignee_emails: [OTHER, ME], event_id: EVENT_A, status: "doing" }),
  task({ id: "3", assignee_emails: [ME], event_id: EVENT_B, status: "done" }),
  task({ id: "4" }),
];

const ids = (list: T[]) => list.map((t) => t.id);

describe("parseTaskFilters", () => {
  it("reads the persona and evento query params", () => {
    expect(parseTaskFilters({ persona: "yo", evento: EVENT_A })).toEqual({
      person: "me",
      eventId: EVENT_A,
    });
    expect(parseTaskFilters({ persona: "nadie" }).person).toBe("unassigned");
    expect(parseTaskFilters({ persona: "Otra@Example.com" }).person).toBe(OTHER);
  });

  it("ignores missing, repeated or invalid values", () => {
    expect(parseTaskFilters({})).toEqual({ person: null, eventId: null });
    expect(parseTaskFilters({ persona: ["yo", "nadie"] }).person).toBeNull();
    expect(parseTaskFilters({ persona: "<script>" }).person).toBeNull();
    expect(parseTaskFilters({ evento: "not-a-uuid" }).eventId).toBeNull();
  });
});

describe("filterTasks", () => {
  it("returns everything without filters", () => {
    expect(ids(filterTasks(tasks, { person: null, eventId: null }, ME))).toEqual([
      "1",
      "2",
      "3",
      "4",
    ]);
  });

  it("keeps my tasks with «Mis tareas», also when shared with others", () => {
    expect(ids(filterTasks(tasks, { person: "me", eventId: null }, ME))).toEqual([
      "1",
      "2",
      "3",
    ]);
  });

  it("matches the current user's email case-insensitively", () => {
    expect(
      ids(filterTasks(tasks, { person: "me", eventId: null }, "YO@example.com")),
    ).toEqual(["1", "2", "3"]);
  });

  it("filters by a given person or by unassigned tasks", () => {
    expect(ids(filterTasks(tasks, { person: OTHER, eventId: null }, ME))).toEqual([
      "2",
    ]);
    expect(
      ids(filterTasks(tasks, { person: "unassigned", eventId: null }, ME)),
    ).toEqual(["4"]);
  });

  it("filters by event and combines with the person filter", () => {
    expect(ids(filterTasks(tasks, { person: null, eventId: EVENT_A }, ME))).toEqual([
      "1",
      "2",
    ]);
    expect(ids(filterTasks(tasks, { person: "me", eventId: EVENT_A }, ME))).toEqual([
      "1",
      "2",
    ]);
  });
});

describe("sortTasks", () => {
  it("orders by due date (no date last), then by creation", () => {
    const sorted = sortTasks([
      task({ id: "late", due_date: "2026-12-01" }),
      task({ id: "none-old", created_at: "2026-11-01T00:00:00Z" }),
      task({ id: "soon", due_date: "2026-11-20" }),
      task({ id: "none-new", created_at: "2026-11-10T00:00:00Z" }),
    ]);
    expect(ids(sorted)).toEqual(["soon", "late", "none-old", "none-new"]);
  });
});

describe("groupByStatus", () => {
  it("splits tasks into the four columns", () => {
    const groups = groupByStatus([...tasks, task({ id: "5", status: "review" })]);
    expect(Object.keys(groups)).toEqual(["todo", "doing", "review", "done"]);
    expect(ids(groups.todo)).toEqual(["1", "4"]);
    expect(ids(groups.doing)).toEqual(["2"]);
    expect(ids(groups.review)).toEqual(["5"]);
    expect(ids(groups.done)).toEqual(["3"]);
  });
});

describe("isOverdue", () => {
  it("is overdue only before today and when not done", () => {
    expect(isOverdue(task({ due_date: "2026-11-13" }), "2026-11-14")).toBe(true);
    expect(isOverdue(task({ due_date: "2026-11-14" }), "2026-11-14")).toBe(false);
    expect(
      isOverdue(task({ due_date: "2026-11-13", status: "done" }), "2026-11-14"),
    ).toBe(false);
    expect(isOverdue(task({}), "2026-11-14")).toBe(false);
  });
});
