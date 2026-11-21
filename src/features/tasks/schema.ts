import { z } from "zod";

// Board order. "review" = done by the assignees, waiting for someone to check
// it and mark it as done (anyone can).
export const TASK_STATUSES = ["todo", "doing", "review", "done"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  todo: "Por hacer",
  doing: "En curso",
  review: "Pendiente de revisión",
  done: "Hecho",
};

export const MAX_ASSIGNEES = 20;

// Optional; a task without priority shows "—".
export const TASK_PRIORITIES = ["high", "medium", "low"] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  high: "Alta",
  medium: "Media",
  low: "Baja",
};

export const TASK_LINK_MAX = 2000;

export const taskStatusSchema = z.enum(TASK_STATUSES, "Estado no válido.");

// Trims strings; blank values become null.
function blankToNull(value: unknown) {
  if (typeof value !== "string") return value ?? null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

// "YYYY-MM-DD" that exists in the calendar.
export function isValidIsoDate(value: string) {
  const match = DATE_PATTERN.exec(value);
  if (!match) return false;
  const [year, month, day] = match.slice(1).map(Number);
  const probe = new Date(Date.UTC(year, month - 1, day));
  return (
    probe.getUTCFullYear() === year &&
    probe.getUTCMonth() === month - 1 &&
    probe.getUTCDate() === day
  );
}

// Shared by the create and update server actions. Input: form fields as
// strings, plus `assignee_emails` as the list of checked members. Output: a
// `tasks` row (without id / created_by / timestamps) plus the assignee list.
export const taskFormSchema = z.object({
  title: z
    .string("El título es obligatorio.")
    .trim()
    .min(1, "El título es obligatorio.")
    .max(200, "El título admite como máximo 200 caracteres."),
  description: z.preprocess(
    blankToNull,
    z.string().max(5000, "Descripción: máximo 5000 caracteres.").nullable(),
  ),
  status: z.preprocess(
    (value) => blankToNull(value) ?? "todo",
    taskStatusSchema,
  ),
  assignee_emails: z.preprocess(
    (value) => {
      const list = Array.isArray(value) ? value : value == null ? [] : [value];
      const emails = list
        .map((item) => (typeof item === "string" ? item.trim().toLowerCase() : item))
        .filter((item) => item !== "");
      return [...new Set(emails)];
    },
    z
      .array(z.email("Elige personas de la lista."), "Elige personas de la lista.")
      .max(MAX_ASSIGNEES, `Como máximo ${MAX_ASSIGNEES} responsables.`),
  ),
  due_date: z.preprocess(
    blankToNull,
    z
      .string()
      .refine(isValidIsoDate, "La fecha límite no es válida.")
      .nullable(),
  ),
  event_id: z.preprocess(
    blankToNull,
    z.uuid("Elige un evento de la lista.").nullable(),
  ),
  priority: z.preprocess(
    blankToNull,
    z.enum(TASK_PRIORITIES, "Elige una prioridad de la lista.").nullable(),
  ),
  // Only http(s) links: the table renders it as a clickable link.
  link_url: z.preprocess(
    blankToNull,
    z
      .url({ protocol: /^https?$/, error: "Pega un enlace que empiece por https://." })
      .max(TASK_LINK_MAX, `El enlace admite como máximo ${TASK_LINK_MAX} caracteres.`)
      .nullable(),
  ),
  // "Recordarme por correo" checkbox: present ("on") when checked. The daily
  // cron emails the assignees the day before the due date.
  email_reminder: z.preprocess(
    (value) => value === "on" || value === true,
    z.boolean(),
  ),
});

// The tasks table toggle sends "true" / "false".
export const taskReminderToggleSchema = z
  .enum(["true", "false"], "Valor no válido.")
  .transform((value) => value === "true");

export type TaskFormInput = z.output<typeof taskFormSchema>;

// The `tasks` row of a parsed form. `assignee_email` keeps the first assignee
// for code that still reads that column (see the task_assignees migration).
export function taskRow({ assignee_emails, ...row }: TaskFormInput) {
  return { ...row, assignee_email: assignee_emails[0] ?? null };
}

export type TaskRowInput = ReturnType<typeof taskRow>;
