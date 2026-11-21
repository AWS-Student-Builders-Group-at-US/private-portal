import Link from "next/link";
import { Plus } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { madridToday } from "../dates";
import { sortTasks } from "../filters";
import { listEventTasks } from "../queries";
import { TASK_STATUSES, TASK_STATUS_LABELS } from "../schema";
import { TaskMeta } from "./task-meta";

// "Tareas" section of the event page: the event's tasks grouped by status.
export async function EventTasks({ eventId }: { eventId: string }) {
  const tasks = sortTasks(await listEventTasks(eventId));
  const today = madridToday();
  const ordered = TASK_STATUSES.flatMap((status) =>
    tasks.filter((task) => task.status === status),
  );
  const done = tasks.filter((task) => task.status === "done").length;

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">
          Tareas
          {tasks.length > 0 && (
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              {done} de {tasks.length} hechas
            </span>
          )}
        </h2>
        <div className="flex gap-2">
          {tasks.length > 0 && (
            <Link
              href={`/panel/tareas?evento=${eventId}`}
              className={buttonVariants({ variant: "ghost", size: "sm" })}
            >
              Ver en Tareas
            </Link>
          )}
          <Link
            href={`/panel/tareas/nueva?evento=${eventId}`}
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            <Plus />
            Nueva tarea
          </Link>
        </div>
      </div>
      {tasks.length === 0 ? (
        <p className="text-sm text-muted-foreground">Este evento no tiene tareas.</p>
      ) : (
        <ul className="divide-y rounded-lg border">
          {ordered.map((task) => (
            <li key={task.id}>
              <Link
                href={`/panel/tareas/${task.id}?volver=evento`}
                className="flex flex-col gap-1 px-4 py-3 hover:bg-muted"
              >
                <span className="flex items-center justify-between gap-3">
                  <span
                    className={
                      task.status === "done"
                        ? "truncate text-muted-foreground line-through"
                        : "truncate font-medium"
                    }
                  >
                    {task.title}
                  </span>
                  <span className="shrink-0 rounded-full border px-2 py-0.5 text-xs text-muted-foreground">
                    {TASK_STATUS_LABELS[task.status]}
                  </span>
                </span>
                <TaskMeta task={task} today={today} showEvent={false} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
