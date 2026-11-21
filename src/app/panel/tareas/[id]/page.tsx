import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { formatMadridDateTimeShort } from "@/features/events/time";
import { updateTask } from "@/features/tasks/actions";
import { DeleteTaskButton } from "@/features/tasks/components/delete-task-button";
import { TaskForm } from "@/features/tasks/components/task-form";
import {
  getTask,
  listEventOptions,
  listMemberOptions,
} from "@/features/tasks/queries";

export default async function EditTaskPage({
  params,
  searchParams,
}: PageProps<"/panel/tareas/[id]">) {
  const [{ id }, { volver }] = await Promise.all([params, searchParams]);
  const [task, members, events] = await Promise.all([
    getTask(id),
    listMemberOptions(),
    listEventOptions(),
  ]);
  if (!task) notFound();

  // Opened from the event page (?volver=evento): go back there after saving.
  const fromEvent = volver === "evento" && task.event_id;
  const backHref = fromEvent ? `/panel/eventos/${task.event_id}` : "/panel/tareas";

  return (
    <div className="flex flex-col gap-6">
      <Link
        href={backHref}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        {fromEvent ? "Evento" : "Tareas"}
      </Link>
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">Editar tarea</h1>
        <p className="text-xs text-muted-foreground">
          Creada por {task.created_by} el {formatMadridDateTimeShort(task.created_at)}
        </p>
      </div>
      <TaskForm
        action={updateTask.bind(null, task.id)}
        initialValues={{
          title: task.title,
          description: task.description ?? "",
          status: task.status,
          assignee_emails: task.assignee_emails.join(","),
          due_date: task.due_date ?? "",
          event_id: task.event_id ?? "",
        }}
        members={members}
        events={events}
        submitLabel="Guardar cambios"
        cancelHref={backHref}
        returnTo={fromEvent ? backHref : undefined}
      />
      <DeleteTaskButton taskId={task.id} returnTo={fromEvent ? backHref : undefined} />
    </div>
  );
}
