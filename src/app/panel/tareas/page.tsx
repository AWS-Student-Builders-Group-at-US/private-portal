import Link from "next/link";
import { Plus } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { madridToday } from "@/features/tasks/dates";
import {
  PERSON_ME,
  PERSON_UNASSIGNED,
  filterTasks,
  parseTaskFilters,
  sortTasks,
} from "@/features/tasks/filters";
import { TaskStatusMessage } from "@/features/tasks/components/status-message";
import { TaskBoard } from "@/features/tasks/components/task-board";
import { TaskFilters } from "@/features/tasks/components/task-filters";
import {
  listEventOptions,
  listMemberOptions,
  listTasks,
} from "@/features/tasks/queries";
import { getCurrentMember } from "@/lib/auth/member";

export default async function TasksPage({
  searchParams,
}: PageProps<"/panel/tareas">) {
  const [params, member, tasks, members, events] = await Promise.all([
    searchParams,
    getCurrentMember(),
    listTasks(),
    listMemberOptions(),
    listEventOptions(),
  ]);
  const filters = parseTaskFilters(params);
  const visible = sortTasks(filterTasks(tasks, filters, member.email));
  const persona =
    filters.person === "me"
      ? PERSON_ME
      : filters.person === "unassigned"
        ? PERSON_UNASSIGNED
        : (filters.person ?? "");
  const newHref = filters.eventId
    ? `/panel/tareas/nueva?evento=${filters.eventId}`
    : "/panel/tareas/nueva";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">Tareas</h1>
        <Link href={newHref} className={buttonVariants()}>
          <Plus />
          Nueva tarea
        </Link>
      </div>
      <TaskStatusMessage status={params.estado} />
      <TaskFilters
        persona={persona}
        evento={filters.eventId ?? ""}
        members={members}
        events={events}
      />
      {tasks.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Todavía no hay tareas. Crea la primera con «Nueva tarea».
        </p>
      ) : (
        <>
          {visible.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Ninguna tarea coincide con los filtros.
            </p>
          )}
          <TaskBoard tasks={visible} today={madridToday()} />
        </>
      )}
    </div>
  );
}
