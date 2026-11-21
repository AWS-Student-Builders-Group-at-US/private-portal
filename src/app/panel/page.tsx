import Link from "next/link";
import { ChevronRight, ThumbsUp } from "lucide-react";
import { splitEvents } from "@/features/events/components/event-list";
import { listEvents } from "@/features/events/queries";
import { formatMadridDateTimeShort } from "@/features/events/time";
import { sortSuggestions } from "@/features/suggestions/logic";
import { TaskMeta } from "@/features/tasks/components/task-meta";
import { madridToday } from "@/features/tasks/dates";
import { filterTasks, sortTasks } from "@/features/tasks/filters";
import { listTasks } from "@/features/tasks/queries";
import { listSuggestions } from "@/features/suggestions/queries";
import { getCurrentMember } from "@/lib/auth/member";

const HOME_LIMIT = 3;

export default async function HomePage() {
  const member = await getCurrentMember();
  const [events, suggestions, tasks] = await Promise.all([
    listEvents(),
    listSuggestions(member.email),
    listTasks(),
  ]);
  const myPending = sortTasks(
    filterTasks(tasks, { people: ["me"], eventId: null }, member.email).filter(
      (task) => task.status !== "done",
    ),
  );
  const today = madridToday();
  const upcoming = splitEvents(events, new Date()).upcoming.slice(0, HOME_LIMIT);
  const fresh = suggestions.filter((s) => s.status === "nueva");
  const topFresh = sortSuggestions(fresh).slice(0, HOME_LIMIT);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">Hola, {member.name}</h1>
        <p className="text-muted-foreground">Esto es lo que tienes por delante.</p>
      </div>

      <HomeSection
        title={`Mis tareas pendientes${myPending.length ? ` (${myPending.length})` : ""}`}
        href="/panel/tareas?persona=yo"
        linkLabel="Ver tareas"
      >
        {myPending.length === 0 ? (
          <Empty>No tienes tareas pendientes.</Empty>
        ) : (
          <ul className="divide-y rounded-lg border">
            {myPending.slice(0, HOME_LIMIT + 2).map((task) => (
              <li key={task.id}>
                <Link
                  href={`/panel/tareas/${task.id}`}
                  className="flex flex-col gap-1 px-4 py-3 hover:bg-muted"
                >
                  <span className="truncate font-medium">{task.title}</span>
                  <TaskMeta task={task} today={today} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </HomeSection>

      <HomeSection title="Próximos eventos" href="/panel/eventos" linkLabel="Ver eventos">
        {upcoming.length === 0 ? (
          <Empty>No hay eventos próximos.</Empty>
        ) : (
          <ul className="divide-y rounded-lg border">
            {upcoming.map((event) => (
              <li key={event.id}>
                <Link
                  href={`/panel/eventos/${event.id}`}
                  className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-muted"
                >
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate font-medium">{event.title}</span>
                    <span className="text-sm text-muted-foreground">
                      {formatMadridDateTimeShort(event.starts_at)}
                      {event.location && ` · ${event.location}`}
                    </span>
                  </span>
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </HomeSection>

      <HomeSection
        title={`Sugerencias nuevas${fresh.length ? ` (${fresh.length})` : ""}`}
        href="/panel/sugerencias"
        linkLabel="Ver sugerencias"
      >
        {topFresh.length === 0 ? (
          <Empty>No hay sugerencias nuevas.</Empty>
        ) : (
          <ul className="divide-y rounded-lg border">
            {topFresh.map((suggestion) => (
              <li key={suggestion.id} className="flex items-start gap-3 px-4 py-3">
                <span className="flex shrink-0 items-center gap-1 text-sm text-muted-foreground tabular-nums">
                  <ThumbsUp className="size-3.5" aria-hidden />
                  {suggestion.votes}
                </span>
                <p className="line-clamp-2 text-sm">{suggestion.body}</p>
              </li>
            ))}
          </ul>
        )}
      </HomeSection>
    </div>
  );
}

function HomeSection({
  title,
  href,
  linkLabel,
  children,
}: {
  title: string;
  href: string;
  linkLabel: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">{title}</h2>
        <Link href={href} className="text-sm text-muted-foreground hover:text-foreground">
          {linkLabel}
        </Link>
      </div>
      {children}
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted-foreground">{children}</p>;
}
