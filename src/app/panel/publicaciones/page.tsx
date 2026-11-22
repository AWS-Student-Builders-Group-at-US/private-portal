import Link from "next/link";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { StatusBanner } from "@/components/status-banner";
import { buttonVariants } from "@/components/ui/button";
import { groupBy } from "@/lib/group";
import { cn } from "@/lib/utils";
import { formatMadridDateTimeShort, utcIsoToMadridLocal } from "@/features/events/time";
import { formatMonth, monthGrid, parseMonth, shiftMonth } from "@/features/posts/calendar";
import { PostStatusBadge } from "@/features/posts/components/status-badge";
import { MetricsSummary, PostMetricsInline } from "@/features/posts/components/post-metrics";
import { ZernioBadge } from "@/features/posts/components/zernio-bits";
import { listPostMetrics } from "@/features/posts/metrics";
import { listPosts } from "@/features/posts/queries";
import { POST_STATUSES, POST_STATUS_LABELS, POST_TARGET_LABELS, type PostStatus } from "@/features/posts/schema";
import type { Post } from "@/features/posts/types";

const MESSAGES = { eliminada: "Publicación eliminada." };
const WEEKDAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

export default async function PostsPage({ searchParams }: PageProps<"/panel/publicaciones">) {
  const [params, posts, metrics] = await Promise.all([searchParams, listPosts(), listPostMetrics()]);
  const calendar = params.vista === "calendario";
  const status = POST_STATUSES.find((s) => s === params.estado_pub) ?? null;
  const zernioOnly = params.origen === "zernio";
  const visible = posts.filter(
    (p) => (!status || p.status === status) && (!zernioOnly || p.source === "zernio"),
  );
  const zernioCount = posts.filter((p) => p.source === "zernio").length;
  const visibleMetrics = visible.flatMap((p) => {
    const m = p.status === "published" ? metrics.get(p.id) : undefined;
    return m ? [m] : [];
  });
  const thisMonth = utcIsoToMadridLocal(new Date().toISOString()).slice(0, 7);
  const month = parseMonth(params.mes, thisMonth);

  const href = (next: Record<string, string | null>) => {
    const query = new URLSearchParams();
    const merged = {
      vista: calendar ? "calendario" : null,
      estado_pub: status,
      origen: zernioOnly ? "zernio" : null,
      mes: calendar && month !== thisMonth ? month : null,
      ...next,
    };
    for (const [k, v] of Object.entries(merged)) if (v) query.set(k, v);
    const qs = query.toString();
    return qs ? `/panel/publicaciones?${qs}` : "/panel/publicaciones";
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">Publicaciones</h1>
        <Link href="/panel/publicaciones/nueva" className={buttonVariants()}>
          <Plus />
          Nueva publicación
        </Link>
      </div>
      <StatusBanner status={params.estado} messages={MESSAGES} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav className="flex flex-wrap gap-1" aria-label="Filtrar por estado">
          <Chip href={href({ estado_pub: null })} active={!status}>Todas</Chip>
          {POST_STATUSES.map((s) => (
            <Chip key={s} href={href({ estado_pub: s })} active={status === s}>
              {POST_STATUS_LABELS[s]}{" "}
              <span className="text-xs opacity-70">{posts.filter((p) => p.status === s).length}</span>
            </Chip>
          ))}
          {zernioCount > 0 && (
            <Chip href={href({ origen: zernioOnly ? null : "zernio" })} active={zernioOnly}>
              Planificadas en Zernio <span className="text-xs opacity-70">{zernioCount}</span>
            </Chip>
          )}
        </nav>
        <nav className="flex rounded-lg border p-0.5" aria-label="Vista">
          <Chip href={href({ vista: null, mes: null })} active={!calendar}>Lista</Chip>
          <Chip href={href({ vista: "calendario" })} active={calendar}>Calendario</Chip>
        </nav>
      </div>

      {!calendar && <MetricsSummary metrics={visibleMetrics} />}

      {calendar ? (
        <MonthCalendar posts={visible} month={month} href={href} />
      ) : visible.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {posts.length === 0 ? "Todavía no hay publicaciones." : "No hay publicaciones con ese estado."}
        </p>
      ) : (
        <PostMonths
          posts={visible}
          thisMonth={thisMonth}
          row={(post) => <PostRow key={post.id} post={post} metrics={metrics} />}
        />
      )}
    </div>
  );
}

function PostRow({
  post,
  metrics,
}: {
  post: Post;
  metrics: Awaited<ReturnType<typeof listPostMetrics>>;
}) {
  return (
    <li>
      <Link href={`/panel/publicaciones/${post.id}`} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted">
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="truncate font-medium">{post.title}</span>
          <span className="text-xs text-muted-foreground">
            {post.scheduled_at ? formatMadridDateTimeShort(post.scheduled_at) : "Sin fecha"} ·{" "}
            {post.targets.map((t) => POST_TARGET_LABELS[t]).join(", ")}
            {post.event_title && ` · ${post.event_title}`}
            {!post.show_on_site && " · Oculta en la web"}
          </span>
          {post.status === "published" && metrics.has(post.id) && (
            <PostMetricsInline metrics={metrics.get(post.id)!} />
          )}
        </span>
        <span className="flex shrink-0 flex-col items-end gap-1 sm:flex-row sm:items-center sm:gap-3">
          {post.source === "zernio" && <ZernioBadge />}
          <PostStatusBadge status={post.status} />
        </span>
      </Link>
    </li>
  );
}

// List view grouped by scheduled month, in the list's order (oldest first,
// undated last). Months before the current one start collapsed.
function PostMonths({
  posts,
  thisMonth,
  row,
}: {
  posts: Post[];
  thisMonth: string;
  row: (post: Post) => React.ReactNode;
}) {
  const months = groupBy(posts, (post) =>
    post.scheduled_at ? utcIsoToMadridLocal(post.scheduled_at).slice(0, 7) : null,
  );
  return (
    <div className="flex flex-col gap-5">
      {months.map(({ key, items }) => {
        const heading = key ? formatMonth(key) : "Sin fecha";
        const count = (
          <span className="text-xs font-normal text-muted-foreground">{items.length}</span>
        );
        const list = <ul className="divide-y">{items.map(row)}</ul>;
        if (key !== null && key < thisMonth) {
          return (
            <details key={key} className="group rounded-lg border">
              <summary className="flex cursor-pointer list-none items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 [&::-webkit-details-marker]:hidden">
                <ChevronRight
                  aria-hidden
                  className="size-4 text-muted-foreground transition-transform group-open:rotate-90"
                />
                <span className="first-letter:uppercase">{heading}</span>
                {count}
              </summary>
              <div className="border-t">{list}</div>
            </details>
          );
        }
        return (
          <section key={key ?? "-"} className="flex flex-col gap-2">
            <h2 className="flex items-baseline gap-2 text-sm font-semibold">
              <span className="first-letter:uppercase">{heading}</span>
              {count}
            </h2>
            <div className="rounded-lg border">{list}</div>
          </section>
        );
      })}
    </div>
  );
}

function Chip({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "rounded-md px-3 py-1 text-sm transition-colors",
        active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      {children}
    </Link>
  );
}

function MonthCalendar({
  posts,
  month,
  href,
}: {
  posts: Post[];
  month: string;
  href: (next: Record<string, string | null>) => string;
}) {
  const byDay = new Map<string, Post[]>();
  for (const post of posts) {
    if (!post.scheduled_at) continue;
    const day = utcIsoToMadridLocal(post.scheduled_at).slice(0, 10);
    byDay.set(day, [...(byDay.get(day) ?? []), post]);
  }
  const unscheduled = posts.filter((p) => !p.scheduled_at);
  const statusDot: Record<PostStatus, string> = {
    draft: "bg-muted-foreground/50",
    review: "bg-[var(--aws-orange)]",
    approved: "bg-emerald-500",
    published: "bg-[var(--aws-squid)] dark:bg-white",
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Link href={href({ mes: shiftMonth(month, -1) })} aria-label="Mes anterior" className={buttonVariants({ variant: "outline", size: "icon" })}>
          <ChevronLeft />
        </Link>
        <span className="min-w-40 text-center font-medium capitalize">{formatMonth(month)}</span>
        <Link href={href({ mes: shiftMonth(month, 1) })} aria-label="Mes siguiente" className={buttonVariants({ variant: "outline", size: "icon" })}>
          <ChevronRight />
        </Link>
      </div>
      <div className="overflow-x-auto">
        <div className="grid min-w-[42rem] grid-cols-7 overflow-hidden rounded-lg border">
          {WEEKDAYS.map((d) => (
            <div key={d} className="border-b bg-muted px-2 py-1 text-xs font-medium">{d}</div>
          ))}
          {monthGrid(month).flat().map((day) => (
            <div key={day} className={cn("flex min-h-24 flex-col gap-1 border-r border-b p-1.5 [&:nth-child(7n)]:border-r-0", !day.startsWith(month) && "bg-muted/40 text-muted-foreground")}>
              <span className="text-xs">{Number(day.slice(8))}</span>
              {(byDay.get(day) ?? []).map((post) => (
                <Link key={post.id} href={`/panel/publicaciones/${post.id}`} className="flex items-center gap-1 truncate rounded px-1 py-0.5 text-xs hover:bg-muted" title={`${post.title} · ${POST_STATUS_LABELS[post.status]}`}>
                  <span aria-hidden className={cn("size-2 shrink-0 rounded-full", statusDot[post.status])} />
                  <span className="truncate">{post.title}</span>
                </Link>
              ))}
            </div>
          ))}
        </div>
      </div>
      {unscheduled.length > 0 && (
        <p className="text-sm text-muted-foreground">
          {unscheduled.length === 1 ? "1 publicación sin fecha" : `${unscheduled.length} publicaciones sin fecha`} (en la vista de lista).
        </p>
      )}
    </div>
  );
}
