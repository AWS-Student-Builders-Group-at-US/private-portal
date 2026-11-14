import "server-only";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import type { EventOption, MemberOption, Task, TaskCardData } from "./types";

// All reads use the user's session; RLS only returns rows to members.

const TASK_COLUMNS =
  "id, title, description, status, assignee_email, due_date, event_id, created_by, created_at, updated_at";

type TaskWithJoins = Task & {
  assignee: { name: string } | null;
  event: { title: string } | null;
};

function toCard({ assignee, event, ...task }: TaskWithJoins): TaskCardData {
  return {
    ...task,
    assignee_name: assignee?.name ?? null,
    event_title: event?.title ?? null,
  };
}

const CARD_SELECT = `${TASK_COLUMNS}, assignee:members(name), event:events(title)`;

export async function listTasks(): Promise<TaskCardData[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tasks")
    .select(CARD_SELECT)
    .order("created_at", { ascending: true });
  if (error) throw new Error("No se pudieron cargar las tareas.");
  return (data as unknown as TaskWithJoins[]).map(toCard);
}

export async function listEventTasks(eventId: string): Promise<TaskCardData[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tasks")
    .select(CARD_SELECT)
    .eq("event_id", eventId)
    .order("created_at", { ascending: true });
  if (error) throw new Error("No se pudieron cargar las tareas del evento.");
  return (data as unknown as TaskWithJoins[]).map(toCard);
}

export async function getTask(id: string): Promise<Task | null> {
  // An invalid uuid is a "not found"; any other error is a real failure.
  if (!z.uuid().safeParse(id).success) return null;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tasks")
    .select(TASK_COLUMNS)
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error("No se pudo cargar la tarea.");
  return data as Task | null;
}

export async function listMemberOptions(): Promise<MemberOption[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("members")
    .select("email, name")
    .order("name", { ascending: true });
  if (error) throw new Error("No se pudo cargar el equipo.");
  return data;
}

export async function listEventOptions(): Promise<EventOption[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("events")
    .select("id, title")
    .order("starts_at", { ascending: false });
  if (error) throw new Error("No se pudieron cargar los eventos.");
  return data;
}
