"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { safePanelPath, withStatus } from "@/lib/navigation";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/features/events/types";
import { taskFormSchema, taskReminderToggleSchema, taskRow, taskStatusSchema } from "./schema";
import type { TaskFormState } from "./types";

// Every action runs with the user's session (server client, never the secret
// admin key); RLS rejects non-members. Updates and deletes that RLS filters
// out return no rows, which we report as "not found or no access".

const TASKS_PATH = "/panel/tareas";
const idSchema = z.uuid();

function revalidateTaskPaths(eventIds: (string | null | undefined)[] = []) {
  revalidatePath(TASKS_PATH);
  for (const eventId of new Set(eventIds)) {
    if (eventId) revalidatePath(`/panel/eventos/${eventId}`);
  }
}

function formValues(formData: FormData) {
  const values: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string" && !key.startsWith("$")) values[key] = value;
  }
  return values;
}

// `values` echoes the form back after an error; the checked assignees travel
// as one comma-separated string.
function parseTaskForm(formData: FormData) {
  const assignees = formData
    .getAll("assignee_emails")
    .filter((value): value is string => typeof value === "string");
  const values: Record<string, string> = {
    ...formValues(formData),
    assignee_emails: assignees.join(","),
  };
  const parsed = taskFormSchema.safeParse({ ...values, assignee_emails: assignees });
  if (parsed.success) {
    return {
      ok: true,
      values,
      row: taskRow(parsed.data),
      assignees: parsed.data.assignee_emails,
    } as const;
  }
  const state: TaskFormState = {
    message: "Revisa los campos marcados.",
    fieldErrors: z.flattenError(parsed.error).fieldErrors,
    values,
  };
  return { ok: false, state } as const;
}

// A missing member or event (stale option or tampered form) breaks a foreign
// key (Postgres 23503): report it on the field instead of a generic error.
function foreignKeyError(
  error: { code?: string; message?: string; details?: string },
  values: Record<string, string>,
): TaskFormState | null {
  if (error.code !== "23503") return null;
  const text = `${error.message ?? ""} ${error.details ?? ""}`;
  const field = text.includes("event_id") ? "event_id" : "assignee_emails";
  return {
    message: "Revisa los campos marcados.",
    fieldErrors: {
      [field]: [
        field === "event_id"
          ? "Ese evento ya no existe. Elige otro."
          : "Alguna de esas personas ya no está en el equipo. Revisa la lista.",
      ],
    },
    values,
  };
}

export async function createTask(
  _prev: TaskFormState,
  formData: FormData,
): Promise<TaskFormState> {
  const parsed = parseTaskForm(formData);
  if (!parsed.ok) return parsed.state;
  const row = parsed.row;

  const supabase = await createClient();
  const { data, error } = await supabase.from("tasks").insert(row).select("id").single();
  const assigned =
    data && (await supabase.rpc("set_task_assignees", {
      p_task_id: data.id,
      p_emails: parsed.assignees,
    }));
  const failure = error ?? assigned?.error;
  if (failure || !data) {
    // Without its assignees the new task would be misleading: remove it.
    if (data) await supabase.from("tasks").delete().eq("id", data.id);
    const fkError = failure && foreignKeyError(failure, parsed.values);
    if (fkError) return fkError;
    return {
      message: "No se pudo crear la tarea. Inténtalo de nuevo.",
      values: parsed.values,
    };
  }

  revalidateTaskPaths([row.event_id]);
  redirect(withStatus(safePanelPath(parsed.values.return_to, TASKS_PATH), "creada"));
}

export async function updateTask(
  id: string,
  _prev: TaskFormState,
  formData: FormData,
): Promise<TaskFormState> {
  if (!idSchema.safeParse(id).success) {
    return { message: "Tarea no encontrada." };
  }
  const parsed = parseTaskForm(formData);
  if (!parsed.ok) return parsed.state;

  const supabase = await createClient();
  const { data: before, error: readError } = await supabase
    .from("tasks")
    .select("event_id")
    .eq("id", id)
    .maybeSingle();
  if (readError || !before) {
    return {
      message: readError
        ? "No se pudieron guardar los cambios. Inténtalo de nuevo."
        : "Tarea no encontrada.",
      values: parsed.values,
    };
  }
  const { data, error } = await supabase
    .from("tasks")
    .update(parsed.row)
    .eq("id", id)
    .select("id");
  const assigned =
    !error && data?.length
      ? await supabase.rpc("set_task_assignees", { p_task_id: id, p_emails: parsed.assignees })
      : null;
  const failure = error ?? assigned?.error;
  if (failure || !data?.length) {
    const fkError = failure && foreignKeyError(failure, parsed.values);
    if (fkError) return fkError;
    return {
      message: "No se pudieron guardar los cambios. Inténtalo de nuevo.",
      values: parsed.values,
    };
  }

  revalidateTaskPaths([before.event_id, parsed.row.event_id]);
  redirect(
    withStatus(safePanelPath(parsed.values.return_to, TASKS_PATH), "guardada"),
  );
}

// Used by drag and drop and by the "move" control on each card.
export async function moveTask(id: string, status: string): Promise<ActionResult> {
  const parsedStatus = taskStatusSchema.safeParse(status);
  if (!idSchema.safeParse(id).success || !parsedStatus.success) {
    return { ok: false, message: "No se pudo mover la tarea." };
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tasks")
    .update({ status: parsedStatus.data })
    .eq("id", id)
    .select("event_id");
  if (error || !data?.length) {
    return { ok: false, message: "No se pudo mover la tarea." };
  }
  revalidateTaskPaths([data[0].event_id as string | null]);
  return { ok: true };
}

// Fields the tasks table edits in place, each validated like the form does.
const FIELD_SCHEMAS = {
  title: taskFormSchema.shape.title,
  description: taskFormSchema.shape.description,
  status: taskStatusSchema,
  priority: taskFormSchema.shape.priority,
  due_date: taskFormSchema.shape.due_date,
  link_url: taskFormSchema.shape.link_url,
  email_reminder: taskReminderToggleSchema,
};
export type EditableTaskField = keyof typeof FIELD_SCHEMAS;

// One field of one task, from the tasks table. Blank values clear optional
// fields (description, priority, deadline, link).
export async function updateTaskField(
  id: string,
  field: EditableTaskField,
  value: string,
): Promise<ActionResult> {
  if (!idSchema.safeParse(id).success || !Object.hasOwn(FIELD_SCHEMAS, field)) {
    return { ok: false, message: "No se pudo guardar el cambio." };
  }
  const parsed = FIELD_SCHEMAS[field].safeParse(value);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Valor no válido." };
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tasks")
    .update({ [field]: parsed.data })
    .eq("id", id)
    .select("event_id");
  if (error || !data?.length) {
    return { ok: false, message: "No se pudo guardar el cambio." };
  }
  revalidateTaskPaths([data[0].event_id as string | null]);
  return { ok: true };
}

// Replaces a task's assignees from the tasks table.
export async function updateTaskAssignees(id: string, emails: string[]): Promise<ActionResult> {
  const parsed = taskFormSchema.shape.assignee_emails.safeParse(emails);
  if (!idSchema.safeParse(id).success || !parsed.success) {
    return { ok: false, message: "No se pudieron guardar los responsables." };
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tasks")
    .update({ assignee_email: parsed.data[0] ?? null })
    .eq("id", id)
    .select("event_id");
  const assigned =
    !error && data?.length
      ? await supabase.rpc("set_task_assignees", { p_task_id: id, p_emails: parsed.data })
      : null;
  if (error || !data?.length || assigned?.error) {
    return { ok: false, message: "No se pudieron guardar los responsables." };
  }
  revalidateTaskPaths([data[0].event_id as string | null]);
  return { ok: true };
}

// `returnTo`: panel path to go back to (e.g. the event page); validated.
export async function deleteTask(
  id: string,
  returnTo?: string,
): Promise<ActionResult> {
  if (!idSchema.safeParse(id).success) {
    return { ok: false, message: "Tarea no encontrada." };
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tasks")
    .delete()
    .eq("id", id)
    .select("event_id");
  if (error || !data?.length) {
    return { ok: false, message: "No se pudo eliminar la tarea." };
  }
  revalidateTaskPaths([data[0].event_id as string | null]);
  redirect(withStatus(safePanelPath(returnTo, TASKS_PATH), "eliminada"));
}
