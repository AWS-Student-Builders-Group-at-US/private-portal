import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { z } from "zod";
import { createTask } from "@/features/tasks/actions";
import { TaskForm } from "@/features/tasks/components/task-form";
import { listEventOptions, listMemberOptions } from "@/features/tasks/queries";

export default async function NewTaskPage({
  searchParams,
}: PageProps<"/panel/tareas/nueva">) {
  const [{ evento }, members, events] = await Promise.all([
    searchParams,
    listMemberOptions(),
    listEventOptions(),
  ]);
  // ?evento=<id> comes from the event page: preselect it and go back there.
  const eventId =
    typeof evento === "string" &&
    z.uuid().safeParse(evento).success &&
    events.some((event) => event.id === evento)
      ? evento
      : null;
  const backHref = eventId ? `/panel/eventos/${eventId}` : "/panel/tareas";

  return (
    <div className="flex flex-col gap-6">
      <Link
        href={backHref}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        {eventId ? "Evento" : "Tareas"}
      </Link>
      <h1 className="text-2xl font-semibold">Nueva tarea</h1>
      <TaskForm
        action={createTask}
        initialValues={{ event_id: eventId ?? "" }}
        members={members}
        events={events}
        submitLabel="Crear tarea"
        cancelHref={backHref}
        returnTo={eventId ? backHref : undefined}
      />
    </div>
  );
}
