import Link from "next/link";
import { CalendarClock, ChevronRight, ExternalLink, MapPin, ThumbsUp } from "lucide-react";
import { splitEvents } from "@/features/events/components/event-list";
import { listEvents } from "@/features/events/queries";
import { formatMadridDateTime, formatMadridDateTimeShort } from "@/features/events/time";
import { pickNextMeeting, splitHomePosts } from "@/features/home/logic";
import { MyReminders } from "@/features/reminders/components/my-reminders";
import { listMyReminders } from "@/features/reminders/queries";
import { PostStatusBadge } from "@/features/posts/components/status-badge";
import { listPosts } from "@/features/posts/queries";
import { POST_TARGET_LABELS } from "@/features/posts/schema";
import type { Post } from "@/features/posts/types";
import { sortSuggestions } from "@/features/suggestions/logic";
import { TaskMeta } from "@/features/tasks/components/task-meta";
import { madridToday } from "@/features/tasks/dates";
import { filterTasks, sortTasks } from "@/features/tasks/filters";
import { listTasks } from "@/features/tasks/queries";
import { listSuggestions } from "@/features/suggestions/queries";
import { EmptyState } from "@/components/empty-state";
import { getCurrentMember } from "@/lib/auth/member";

const HOME_LIMIT = 3;

export default async function HomePage() {
  const member = await getCurrentMember();
  const today = madridToday();
  const [events, suggestions, tasks, posts, reminders] = await Promise.all([
    listEvents(),
    listSuggestions(member.email),
    listTasks(),
    listPosts(),
    listMyReminders(today),
  ]);
  const myPending = sortTasks(
    filterTasks(tasks, { people: ["me"], eventId: null }, member.email).filter(
      (task) => task.status !== "done",
    ),
  );
  const now = new Date();
  const nextMeeting = pickNextMeeting(events, now);
  // The highlighted meeting is not repeated in the events list below it.
  const upcoming = splitEvents(events, now)
    .upcoming.filter((event) => event.id !== nextMeeting?.id)
    .slice(0, HOME_LIMIT);
  const homePosts = splitHomePosts(posts, now, HOME_LIMIT);
  const fresh = suggestions.filter((s) => s.status === "nueva");
  const topFresh = sortSuggestions(fresh).slice(0, HOME_LIMIT);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">Hola, {member.name}</h1>
        <p className="text-muted-foreground">Esto es lo que tienes por delante.</p>
      </div>

      <section className="flex flex-col gap-3" aria-labelledby="next-meeting">
        <h2 id="next-meeting" className="text-lg font-semibold">
          Próxima reunión
        </h2>
        {nextMeeting ? (
          <div className="flex flex-col gap-2 rounded-lg border border-l-4 border-l-[var(--aws-orange)] bg-muted/40 px-4 py-4">
            <Link
              href={`/panel/eventos/${nextMeeting.id}`}
              className="text-lg font-semibold underline-offset-4 hover:underline"
            >
              {nextMeeting.title}
            </Link>
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <CalendarClock className="size-4 shrink-0" aria-hidden />
              <span className="first-letter:uppercase">
                {formatMadridDateTime(nextMeeting.starts_at)}
              </span>
            </p>
            {nextMeeting.location && (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="size-4 shrink-0" aria-hidden />
                {nextMeeting.location}
              </p>
            )}
            {nextMeeting.meetup_url && (
              <a
                href={nextMeeting.meetup_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex w-fit items-center gap-2 text-sm underline underline-offset-4"
              >
                <ExternalLink className="size-4 shrink-0" aria-hidden />
                Abrir enlace
              </a>
            )}
          </div>
        ) : (
          <EmptyState>No hay ninguna reunión programada.</EmptyState>
        )}
      </section>

      <div className="grid gap-8 lg:grid-cols-2 lg:items-start">
        <div className="flex min-w-0 flex-col gap-8">
          <HomeSection
            title={`Mis tareas pendientes${myPending.length ? ` (${myPending.length})` : ""}`}
            href="/panel/tareas?persona=yo"
            linkLabel="Ver tareas"
          >
            {myPending.length === 0 ? (
              <EmptyState>No tienes tareas pendientes.</EmptyState>
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

          <MyReminders reminders={reminders} today={today} />
        </div>

        <div className="flex min-w-0 flex-col gap-8">
          <HomeSection title="Próximos eventos" href="/panel/eventos" linkLabel="Ver eventos">
            {upcoming.length === 0 ? (
              <EmptyState>No hay eventos próximos.</EmptyState>
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
              <EmptyState>No hay sugerencias nuevas.</EmptyState>
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
      </div>

      <HomeSection title="Publicaciones" href="/panel/publicaciones" linkLabel="Ver publicaciones">
        <div className="grid gap-4 md:grid-cols-2">
          <PostList
            title="Próximas"
            posts={homePosts.upcoming}
            date={(post) => post.scheduled_at}
            emptyText="No hay publicaciones programadas."
          />
          <PostList
            title="Publicadas recientemente"
            posts={homePosts.recent}
            date={(post) => post.published_at ?? post.scheduled_at}
            emptyText="Todavía no hay publicaciones publicadas."
          />
        </div>
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

function PostList({
  title,
  posts,
  date,
  emptyText,
}: {
  title: string;
  posts: Post[];
  date: (post: Post) => string | null;
  emptyText: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
      {posts.length === 0 ? (
        <EmptyState>{emptyText}</EmptyState>
      ) : (
        <ul className="divide-y rounded-lg border">
          {posts.map((post) => {
            const when = date(post);
            return (
              <li key={post.id}>
                <Link
                  href={`/panel/publicaciones/${post.id}`}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-muted"
                >
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="truncate font-medium">{post.title}</span>
                    <span className="text-xs text-muted-foreground">
                      {when ? formatMadridDateTimeShort(when) : "Sin fecha"} ·{" "}
                      {post.targets.map((t) => POST_TARGET_LABELS[t]).join(", ")}
                    </span>
                  </span>
                  <PostStatusBadge status={post.status} />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
