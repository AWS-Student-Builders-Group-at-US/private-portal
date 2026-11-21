import { z } from "zod";
import { TASK_STATUSES, type TaskStatus } from "./schema";

// Pure board logic: query params -> filters, filtering, sorting, grouping.

type FilterableTask = {
  status: TaskStatus;
  assignee_emails: string[];
  event_id: string | null;
  due_date: string | null;
  created_at: string;
};

// person: null = everyone, "me" = current user, "unassigned", or an email.
export type TaskFilters = {
  person: "me" | "unassigned" | string | null;
  eventId: string | null;
};

// Query param values used by the filter controls.
export const PERSON_ME = "yo";
export const PERSON_UNASSIGNED = "nadie";

type SearchParams = Record<string, string | string[] | undefined>;

function single(value: string | string[] | undefined) {
  return typeof value === "string" ? value.trim() : null;
}

export function parseTaskFilters(params: SearchParams): TaskFilters {
  const persona = single(params.persona)?.toLowerCase() ?? null;
  const evento = single(params.evento);

  let person: TaskFilters["person"] = null;
  if (persona === PERSON_ME) person = "me";
  else if (persona === PERSON_UNASSIGNED) person = "unassigned";
  else if (persona && z.email().safeParse(persona).success) person = persona;

  const eventId = evento && z.uuid().safeParse(evento).success ? evento : null;
  return { person, eventId };
}

export function filterTasks<T extends FilterableTask>(
  tasks: T[],
  filters: TaskFilters,
  currentEmail: string,
): T[] {
  const me = currentEmail.toLowerCase();
  return tasks.filter((task) => {
    if (filters.eventId && task.event_id !== filters.eventId) return false;
    switch (filters.person) {
      case null:
        return true;
      case "me":
        return task.assignee_emails.includes(me);
      case "unassigned":
        return task.assignee_emails.length === 0;
      default:
        return task.assignee_emails.includes(filters.person);
    }
  });
}

// Earliest due date first; tasks without a date go last, oldest first.
export function sortTasks<T extends FilterableTask>(tasks: T[]): T[] {
  return [...tasks].sort((a, b) => {
    if (a.due_date !== b.due_date) {
      if (a.due_date === null) return 1;
      if (b.due_date === null) return -1;
      return a.due_date < b.due_date ? -1 : 1;
    }
    return a.created_at < b.created_at ? -1 : a.created_at > b.created_at ? 1 : 0;
  });
}

export function groupByStatus<T extends FilterableTask>(
  tasks: T[],
): Record<TaskStatus, T[]> {
  const groups = Object.fromEntries(
    TASK_STATUSES.map((status) => [status, [] as T[]]),
  ) as Record<TaskStatus, T[]>;
  for (const task of tasks) groups[task.status].push(task);
  return groups;
}

// `today` is the Madrid calendar date "YYYY-MM-DD".
export function isOverdue(
  task: Pick<FilterableTask, "status" | "due_date">,
  today: string,
) {
  return task.status !== "done" && task.due_date !== null && task.due_date < today;
}
