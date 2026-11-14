"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
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

// Only same-site panel paths are accepted as the post-save destination.
function safeReturnTo(value: string | undefined, fallback: string) {
  return value && /^\/panel(\/[\w\-/]*)?(\?[\w\-=&%.@]*)?$/.test(value)
    ? value
    : fallback;
}

function withStatus(path: string, status: string) {
  return `${path}${path.includes("?") ? "&" : "?"}estado=${status}`;
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
    return {
      message: "No se pudo crear la tarea. Inténtalo de nuevo.",
      values: parsed.values,
    };
  }

  revalidateTaskPaths([row.event_id]);
  redirect(withStatus(safeReturnTo(parsed.values.return_to, TASKS_PATH), "creada"));
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
  const { data: before } = await supabase
    .from("tasks")
    .select("event_id")
    .eq("id", id)
    .maybeSingle();
  const { data, error } = await supabase
    .from("tasks")
    .update(parsed.row)
    .eq("id", id)
    .select("id");
  if (error || !data?.length) {
    return {
      message: "No se pudieron guardar los cambios. Inténtalo de nuevo.",
      values: parsed.values,
    };
  }

  revalidateTaskPaths([before?.event_id, parsed.row.event_id]);
  redirect(
    withStatus(safeReturnTo(parsed.values.return_to, TASKS_PATH), "guardada"),
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

export async function deleteTask(id: string): Promise<ActionResult> {
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
  redirect(withStatus(TASKS_PATH, "eliminada"));
}
