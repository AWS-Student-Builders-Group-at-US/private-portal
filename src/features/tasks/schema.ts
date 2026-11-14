import { z } from "zod";

export const TASK_STATUSES = ["todo", "doing", "done"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  todo: "Por hacer",
  doing: "En curso",
  done: "Hecho",
};

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
// strings. Output: a `tasks` row (without id / created_by / timestamps).
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
  assignee_email: z.preprocess(
    (value) => {
      const cleaned = blankToNull(value);
      return typeof cleaned === "string" ? cleaned.toLowerCase() : cleaned;
    },
    z.email("Elige una persona de la lista.").nullable(),
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
});

export type TaskRowInput = z.output<typeof taskFormSchema>;
