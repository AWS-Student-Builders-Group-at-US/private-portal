"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { safePanelPath, withStatus } from "@/lib/navigation";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/features/events/types";
import { taskFormSchema, taskStatusSchema } from "./schema";
import type { TaskRowInput } from "./schema";
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

function parseTaskForm(formData: FormData) {
  const values = formValues(formData);
  const parsed = taskFormSchema.safeParse(values);
  if (parsed.success) return { ok: true, values, row: parsed.data } as const;
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
  const field = text.includes("event_id") ? "event_id" : "assignee_email";
  return {
    message: "Revisa los campos marcados.",
    fieldErrors: {
      [field]: [
        field === "event_id"
          ? "Ese evento ya no existe. Elige otro."
          : "Esa persona ya no está en el equipo. Elige otra.",
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
  const row: TaskRowInput = parsed.row;

  const supabase = await createClient();
  const { error } = await supabase.from("tasks").insert(row);
  if (error) {
    const fkError = foreignKeyError(error, parsed.values);
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
  if (error || !data?.length) {
    const fkError = error && foreignKeyError(error, parsed.values);
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
