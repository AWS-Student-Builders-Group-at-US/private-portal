import { z } from "zod";
import { TASK_STATUSES, type TaskPriority, type TaskStatus } from "./schema";

// Pure tasks logic: query params -> filters, filtering, sorting, grouping.

type FilterableTask = {
  status: TaskStatus;
  assignee_emails: string[];
  event_id: string | null;
  due_date: string | null;
  created_at: string;
};

// people: the selected values ("me" = current user, "unassigned", or member
// emails); empty = everyone. A task matches when it matches any of them.
export type PersonFilter = "me" | "unassigned" | string;
export type TaskFilters = {
  people: PersonFilter[];
  eventId: string | null;
};

// Query param values used by the filter controls (?persona=yo,ana@…).
export const PERSON_ME = "yo";
export const PERSON_UNASSIGNED = "nadie";

type SearchParams = Record<string, string | string[] | undefined>;

function single(value: string | string[] | undefined) {
  return typeof value === "string" ? value.trim() : null;
}

// ?persona= holds comma-separated values (repeated params also work).
export function parseTaskFilters(params: SearchParams): TaskFilters {
  const raw = [params.persona ?? []]
    .flat()
    .flatMap((value) => value.split(","))
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  const people: PersonFilter[] = [];
  for (const value of raw) {
    const person =
      value === PERSON_ME
        ? "me"
        : value === PERSON_UNASSIGNED
          ? "unassigned"
          : z.email().safeParse(value).success
            ? value
            : null;
    if (person && !people.includes(person)) people.push(person);
  }
  const evento = single(params.evento);
  const eventId = evento && z.uuid().safeParse(evento).success ? evento : null;
  return { people, eventId };
}

// Filter values back to the ?persona= param.
export function personaParam(people: PersonFilter[]) {
  return people
    .map((person) =>
      person === "me" ? PERSON_ME : person === "unassigned" ? PERSON_UNASSIGNED : person,
    )
    .join(",");
}

export function filterTasks<T extends FilterableTask>(
  tasks: T[],
  filters: TaskFilters,
  currentEmail: string,
): T[] {
  const me = currentEmail.toLowerCase();
  return tasks.filter((task) => {
    if (filters.eventId && task.event_id !== filters.eventId) return false;
    if (filters.people.length === 0) return true;
    return filters.people.some((person) =>
      person === "me"
        ? task.assignee_emails.includes(me)
        : person === "unassigned"
          ? task.assignee_emails.length === 0
          : task.assignee_emails.includes(person),
    );
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

// Table order: by status (Por hacer … Hecho, so finished work goes last),
// then as sortTasks (due date, then creation).
export function sortForTable<T extends FilterableTask>(tasks: T[]): T[] {
  const rank = (status: TaskStatus) => TASK_STATUSES.indexOf(status);
  return sortTasks(tasks).sort((a, b) => rank(a.status) - rank(b.status));
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

// Columns the table can sort by.
export const SORT_KEYS = [
  "title",
  "assignees",
  "status",
  "priority",
  "due_date",
  "description",
  "link",
] as const;
export type SortKey = (typeof SORT_KEYS)[number];
export type SortDir = "asc" | "desc";

type SortableTask = FilterableTask & {
  title: string;
  description: string | null;
  priority: TaskPriority | null;
  link_url: string | null;
  assignees: { name: string }[];
};

const PRIORITY_RANK: Record<TaskPriority, number> = { high: 0, medium: 1, low: 2 };
const collator = new Intl.Collator("es", { sensitivity: "base", numeric: true });

// Value of a task for a column; null = empty (always sorted last).
function sortValue(task: SortableTask, key: SortKey): string | number | null {
  switch (key) {
    case "title":
      return task.title;
    case "assignees":
      return task.assignees.map((a) => a.name).join(", ") || null;
    case "status":
      return TASK_STATUSES.indexOf(task.status);
    case "priority":
      return task.priority ? PRIORITY_RANK[task.priority] : null;
    case "due_date":
      return task.due_date;
    case "description":
      return task.description || null;
    case "link":
      return task.link_url;
  }
}

// Sorts by one column; empty values go last in both directions, and ties
// keep the table order (sortForTable).
export function sortTasksBy<T extends SortableTask>(tasks: T[], key: SortKey, dir: SortDir): T[] {
  const sign = dir === "asc" ? 1 : -1;
  return sortForTable(tasks).sort((a, b) => {
    const va = sortValue(a, key);
    const vb = sortValue(b, key);
    if (va === null || vb === null) return va === vb ? 0 : va === null ? 1 : -1;
    const order =
      typeof va === "number" && typeof vb === "number"
        ? va - vb
        : collator.compare(String(va), String(vb));
    return order * sign;
  });
}
