import "server-only";
import { z } from "zod";
import { hideCommonAccount } from "@/features/members/common-account";
import { createClient } from "@/lib/supabase/server";
import type { EventOption, MemberOption, Task, TaskCardData } from "./types";

// All reads use the user's session; RLS only returns rows to members.

const TASK_COLUMNS =
  "id, title, description, status, assignee_email, due_date, event_id, created_by, created_at, updated_at";

// Assignees come from task_assignees, oldest first, with the member's name.
type AssigneeRow = { member_email: string; created_at: string; member: { name: string } | null };

type TaskRow = Omit<Task, "assignee_emails"> & { assignees: AssigneeRow[] };

type TaskWithJoins = TaskRow & { event: { title: string } | null };

function sortedAssignees(rows: AssigneeRow[]) {
  return [...rows].sort((a, b) => (a.created_at < b.created_at ? -1 : a.created_at > b.created_at ? 1 : 0));
}

function toTask({ assignees, ...task }: TaskRow): Task {
  return { ...task, assignee_emails: sortedAssignees(assignees).map((a) => a.member_email) };
}

function toCard({ event, ...row }: TaskWithJoins): TaskCardData {
  return {
    ...toTask(row),
    assignees: sortedAssignees(row.assignees).map((a) => ({
      email: a.member_email,
      name: a.member?.name ?? a.member_email,
    })),
    event_title: event?.title ?? null,
  };
}

const ASSIGNEES_SELECT = "assignees:task_assignees(member_email, created_at, member:members(name))";
const CARD_SELECT = `${TASK_COLUMNS}, ${ASSIGNEES_SELECT}, event:events(title)`;

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
    .select(`${TASK_COLUMNS}, ${ASSIGNEES_SELECT}`)
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error("No se pudo cargar la tarea.");
  return data ? toTask(data as unknown as TaskRow) : null;
}

export async function listMemberOptions(): Promise<MemberOption[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("members")
    .select("email, name")
    .order("name", { ascending: true });
  if (error) throw new Error("No se pudo cargar el equipo.");
  // The group's common account is not a person to assign tasks to.
  return hideCommonAccount(data);
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
