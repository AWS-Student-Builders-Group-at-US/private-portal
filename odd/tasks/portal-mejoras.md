# Portal improvements (round 3)

Locator: `odd/tasks/portal-mejoras.md` · Engram mirror: `odd/portal-mejoras/tasks`.

## Objective

Apply the Core Team wish list of 2026-11-21 that is not already covered on `main`.

## Problem and why

The panel is slow to open (calendar and mail), the home page does not show what matters this week,
and the calendar only knows "busy or free", so members cannot share real meetings or see what the
others have scheduled.

## Already done on `main` (not in scope)

Several assignees per task and the tasks table (Guille, PRs #50–#54); linked Zernio accounts in
Ajustes; group favicon and "Volver a la web" (Guille, #49); group LinkedIn in the footer (Guille,
#47). Quick wins (Core Team link in the header, José's LinkedIn, no "Web pública" placeholder) live
on `feat/quick-wins-portal`; the mail client layout lives on `feat/correo-ui-local`.

## Scope and constraints

- Branch `feat/portal-mejoras` from `main`; PR into `main`.
- UI text in Spanish; code, comments and identifiers in English.
- Migrations: new files only, backward compatible.
- The inbox stays read-only and never stores emails (AGENTS.md).
- Product decision (user, final, T4): Google calendar data stays busy-only; Google event titles
  are never stored or shown. Details exist only for entries members add by hand in the portal.
  Those are personal calendar entries (`calendar_entries`), fully separate from `events` and
  `/panel/eventos`; the UI calls them "entradas", never "eventos".

## Tasks

- [x] T1 Speed: the calendar page no longer waits for Google feeds (refresh in the background,
      serve cached blocks); loading skeletons for calendar and mail.
- [x] T2 Panel home: next meeting, upcoming and recently published posts next to tasks and events.
- [x] T3 Public home: when a member has a panel session, show their team photo as a signed-in
      avatar linking to the panel.
- [x] T4 Calendar redesign: personal calendar entries added by hand with per-entry visibility
      (details / just busy), team view with a per-day agenda, shared subscribable
      "AWS US - Student Builder Group" calendar with group meetings.
  - [x] T4a Calendar entries, visibility enforced in the database, occupation merge, agenda.
  - [x] T4b Shared "AWS US - Student Builder Group" iCal feed with group meetings.
- [x] T5 Posts insights from Zernio: stored per-post metrics (impressions, reach, interactions,
      engagement rate, per-network breakdown) on `/panel/publicaciones` and each post's detail.
- [x] T6 Outgoing email reminders (user decision 2026-11-22: "recordatorios" means emails the
      portal SENDS; inbound emails are still never stored): a "Recordarme por correo" tick on
      tasks (assignees emailed the day before the due date) and free reminders per member
      (emailed to their owner on the chosen date), both sent by the daily cron.
- [x] T7 Shared team calendar in "Equipo" (branch `feat/calendario-equipo`): a
      Disponibilidad/Calendario toggle (counts map unchanged; new week calendar), "Programar
      reunión" for group meetings, the shared iCal link at the bottom of Equipo, and
      update-safe feed fields (CREATED, LAST-MODIFIED, SEQUENCE, hourly refresh hints).

- [x] T8 Performance (branch `perf/panel-cache`, PR #60): instant panel shell, per-session
      private caches, prefetch of cached sections, batched busy-block reads.
- [x] T9 UX/UI of the panel lists (branch `ux/panel-listas`, side session; no data-fetching,
      query, `loading.tsx` or Suspense changes): group, condense and give a clear hierarchy to
      the long flat lists found in the audit below; mobile 375 px and desktop `max-w-6xl`.
  - [x] T9a Shared `ShowMore` ("Ver N más", `aria-expanded`) and `EmptyState` primitives.
  - [x] T9b Panel home: two-column dashboard on desktop, bounded reminders.
  - [x] T9c Calendar Equipo: agenda as day cards, free slots grouped per day, bounded notes,
        collapsible legend help; bounded "Tus entradas".
  - [x] T9d Events (bounded past events), posts list grouped by month, tasks with "Hecho"
        collapsed, event attendees bounded.

## Delivery strategy

`ask-on-risk`. Forecast ~1,500+ authored lines; T1–T3 ~400. One work-unit commit per task.

## Progress and evidence

- T1 (route: delegated direct; writer trigger: 2+ files). `getBusyBlocks` no longer awaits
  `refreshBusyBlocks`: it serves cached `calendar_busy_blocks` and, when feeds are stale (>15 min),
  schedules the refresh with Next `after()` (runs after the response; refresh uses the admin
  client, no request cookies). Callers unchanged: team view and my week (`availability/queries.ts`)
  get cached data; the cron and the feed actions still await `refreshBusyBlocks` directly.
  Trade-off: fresh Google data appears on the next load, not the current one. Added
  `loading.tsx` skeletons for `/panel/calendario` and `/panel/correo` (the panel layout's Suspense
  wraps the whole shell and only helps the first load; on client navigation the page segment had
  no nearer boundary). RED: `busy.test.ts` timed out / `after` not called with the old code;
  GREEN after the change. Checks: eslint clean, `tsc --noEmit` clean, `npm test` 54 files /
  446 tests passed. Not checked in a browser (panel needs Google sign-in).
- T2 (route: delegated direct; writer trigger: 2+ files). The panel home adds a "Próxima reunión"
  card (earliest event from `events` that has not ended; date/time, place and Meetup link when
  set; that event is no longer repeated in "Próximos eventos") and a "Publicaciones" section with
  the next scheduled unpublished posts and the latest published ones (status badge, targets, link
  to each post). DB only: `listPosts()` joins the existing `Promise.all`; `listEvents()` now also
  selects `meetup_url`. Pure helpers in `src/features/home/logic.ts` (`pickNextMeeting`,
  `splitHomePosts`). RED: `logic.test.ts` failed (module missing); GREEN: 6 tests pass. Checks:
  eslint clean, `tsc --noEmit` clean, `npm test` 55 files / 452 tests passed. Not checked in a
  browser (panel needs Google sign-in).
- T3 (route: delegated direct; writer trigger: 2+ files). The public header (`SiteHeader`, shared by
  `/` and `/noticias*`) renders `SignedInMember` inside its own `<Suspense fallback={null}>`: it
  reads the session with the cookie-based server client (never the admin client), looks up the
  member's `name` in `public.members` (RLS returns nothing to non-members) and, for members, shows
  a small avatar linking to `/panel`, next to "Únete". The photo comes from `TEAM` in
  `site/config.ts`, matched by first name (case- and accent-insensitive) against the `members`
  name, then the Google `given_name` / `full_name` / `name` metadata; no emails in config and
  only the display name and public photo reach the browser. Fallback: initials avatar
  (`src/components/member-avatar.tsx`). Signed-out visitors and non-members get the same static
  header. RED: `team-match.test.ts` failed (module missing); GREEN: 4 tests pass. Checks: eslint
  clean, `tsc --noEmit` clean, `npm test` 56 files / 456 tests passed; `next build` with dummy
  Supabase env vars (real `.env` not readable in the sandbox) succeeded and `/` stays
  `◐ Partial Prerender` (revalidate 1m). Not checked signed in (needs Google sign-in); the
  matching assumes each `members.name` or Google given name starts with the `TEAM` first name.

- T4a (route: delegated direct; writer trigger: 2+ non-trivial files). New table
  `calendar_entries` (migration `20261203000000_calendar_entries.sql`): owner, title (1–120),
  notes (≤2000), starts_at/ends_at (end > start, ≤1 day), `visibility` 'details' | 'busy',
  `is_group_meeting` (check forces 'details'). RLS: direct SELECT/INSERT/UPDATE/DELETE only on the
  member's own rows; update granted on content columns only. Everyone's entries are read through
  `public.list_calendar_entries(p_from, p_to)` (security definer, `search_path = ''`, gated by
  `is_member()`, range ≤62 days), which returns title/notes as null for someone else's busy-only
  entry; `entryLabel()` repeats the rule in the UI. Occupation: entries count as busy (1),
  merged with Google by MAX; precedence per slot is hand slot edit (`availability_manual.value`)
  > max(Google, entries), unchanged for Google (`slotOccupationForDay`). UI: "Añadir al
  calendario" form (título, fecha, horas, notas, visibilidad, "Reunión del grupo"), list with
  edit/delete under the week grid; my grid shows entry titles and "Ocupado (Google)" on the
  first cell of each run instead of "G" (M/online/note marks kept); the team view adds member
  colors and an "Agenda de la semana" per day (person, time, title or "Ocupado"; Google busy is
  always "Ocupado"). Entries of the common account are hidden from the team view (like its
  notes). RED: 3 new occupation tests failed and `agenda.test.ts` / `schema.test.ts` failed
  (modules missing); GREEN: all pass. Checks: eslint clean, `tsc --noEmit` clean, `npm test`
  58 files / 474 tests passed. Not verified: the migration was not run against a database
  (SQL reviewed only); not checked in a browser (panel needs Google sign-in).

- T4b (route: delegated direct; writer trigger: 2+ files). `/api/calendario.ics` (per-member
  token auth unchanged) now also reads `calendar_entries` with `is_group_meeting = true` through
  the admin client already allowed for this route (AGENTS.md list unchanged), selecting only
  id/title/notes/times (no owner); personal entries are never queried. A failed entries read
  keeps the feed working with events alone. `buildTeamCalendar` writes `X-WR-CALNAME:AWS US -
  Student Builder Group`, a matching PRODID and `entry-<id>@domain` UIDs; filename
  `aws-us-student-builder-group.ics`. Subscription copy updated in "Mi disponibilidad". RED: 2
  new `ics-export.test.ts` tests failed (old name, no group meetings); GREEN: 10/10. Checks:
  eslint clean, `tsc --noEmit` clean, `npm test` 58 files / 476 tests passed; `next build` with
  dummy Supabase env vars succeeded (`/panel/calendario` stays `◐`). Not verified: migration
  against a database; the feed with real data; browser UI (needs Google sign-in). Existing
  subscribers keep their URL; Google may keep the old calendar name until re-subscribed.

- T5 (route: direct inline in a side session; ~670 authored lines over 14 files, above the
  ~400 heuristic because migration, sync, hooks and UI only make sense together). Research
  (primary source, docs.zernio.com `llms.txt`, `/products/analytics`, `/analytics/get-analytics`):
  `GET /v1/analytics` lists posts with `analytics` {impressions, reach, likes, comments, shares,
  saves, clicks, views, engagementRate, lastUpdated} and `platformAnalytics[]`; Zernio syncs them
  about hourly; `source=late` keeps posts made through Zernio (`latePostId`); 402
  `analytics_addon_required` on legacy plans without the Analytics add-on (usage-based plans
  include it); webhook `analytics.synced` fires per account sync. Implementation: new table
  `post_metrics` (migration `20261204000000_post_metrics.sql`, RLS select with `is_member()`,
  writes server-only); `listPostAnalytics()` in the server-only client; pure
  `mapPostAnalytics` / `summarizeMetrics` / `formatCount` in `zernio/analytics.ts`;
  `syncPostMetrics()` (`zernio/metrics-sync.ts`, never throws, last 90 days, ≤6 pages of 50,
  reports `addonRequired`) runs after the posts sync in the daily cron, in "Sincronizar ahora"
  and on the `analytics.synced` webhook (after the response; outcome only logged). Pages read
  only the table: list shows a "Rendimiento en redes" summary for the visible published posts
  and a one-line insight per post; detail shows totals plus a per-network table. The panel
  home does not read metrics. RED: `analytics.test.ts` failed (module missing); GREEN: 9 tests.
  Checks: eslint clean, `tsc --noEmit` clean, `npm test` 59 files / 485 tests passed; `next
  build` with dummy Supabase env vars succeeded. Not verified: the group's Zernio plan has the
  Analytics add-on (no API key in the sandbox; "Sincronizar ahora" now says so on 402); the
  migration against a database; the browser UI (needs Google sign-in). To get webhook-driven
  refreshes, `analytics.synced` must be enabled on the Zernio webhook (otherwise daily cron).

- T6 (route: direct inline in a side session; ~900 authored lines over 3 work units, above the
  ~400 heuristic because migration, cron and two UIs only make sense together). Migration
  `20261205000000_email_reminders.sql`: `tasks.email_reminder boolean default false`;
  server-only `task_reminder_sends` (PK task, member, due_date; RLS on, no policies, revoked
  from anon/authenticated) so a (task, assignee, due date) is emailed once and a new due date
  allows one new reminder; owner-only `reminders` (title 1–200, note ≤2000, `remind_on` date,
  `sent_at` set only by the cron; members may update title/note/remind_on, a trigger clears
  `sent_at` when the date changes). Pure rules in `src/features/reminders/logic.ts`
  (`dueTaskReminders`: ticked, not done, due today or tomorrow in Madrid, deduped, common
  account skipped; `dueReminders`: pending, due today, up to 7 days late after missed runs;
  `groupByRecipient`: one email per member) and `email.ts` (subject without line breaks, HTML
  escaped). `sendDailyReminders()` (`reminders/send.ts`, admin client, never throws, counts
  only) runs in parallel inside `/api/cron/diario` (04:00 UTC, so emails arrive early in the
  morning in Madrid) and claims each item in the database before sending (insert into
  `task_reminder_sends` with ignore-duplicates / `sent_at` flip where null), releasing the
  claim if SMTP fails. UI: "Recordarme por correo" checkbox in the task form and an "Avisar"
  tick under the deadline in `TaskTable`; "Mis recordatorios" on the panel home (create, edit,
  delete, "Enviado" badge; RLS: own rows only). AGENTS.md admin-client list and `admin.ts`
  comment updated. RED: `logic.test.ts`, `email.test.ts`, `schema.test.ts` failed (modules
  missing), then 2 task schema tests failed (no `email_reminder`); GREEN: all pass. Checks:
  eslint clean on changed paths, `tsc --noEmit` clean, `npm test` 62 files / 505 tests
  passed, `next build` with dummy Supabase env vars succeeded. Commits: `ca88acd` (migration,
  logic, cron), `3ddd1f7` (task tick), `642f095` (Mis recordatorios). Not verified: the
  migration against a database (SQL reviewed only); a real SMTP send (no Gmail credentials in
  the sandbox); the browser UI (needs Google sign-in). The cron is daily on Vercel Hobby, so
  "24 h before" means the morning of the day before the due date.

- T7 (route: direct inline in a side session; ~750 authored lines over 4 work units, mostly
  the week calendar component and re-indentation of the unchanged counts view). No migration:
  `events` and `calendar_entries` already have `created_at`/`updated_at`. Feed
  (`ics-export.ts`): VCALENDAR gains `REFRESH-INTERVAL;VALUE=DURATION:PT1H` and
  `X-PUBLISHED-TTL:PT1H`; every VEVENT keeps its stable UID (`<id>@host`, `entry-<id>@host`)
  and DTSTAMP and gains CREATED, LAST-MODIFIED and `SEQUENCE` = whole seconds between
  `created_at` and `updated_at` (grows with each edit, 0 when missing); deleted rows simply
  drop out. The route still reads only `is_group_meeting` entries. Week calendar:
  `week-layout.ts` (`layoutDay` puts overlapping agenda items in side-by-side lanes per group
  of overlaps, touching items do not overlap, items crossing midnight run to 24:00;
  `hourRange` widens 08:00–22:00 to whole hours) drawn by `TeamWeekCalendar` (days as
  columns, hour rows, blocks in each person's colour, Google busy lighter, group meetings with
  a ring and icon, per-day screen-reader lists; scrolls horizontally inside its own box with a
  sticky hour column). `TeamView` gets a segmented toggle (`aria-pressed`) stored in
  `?modo=calendario` via `history.replaceState`; the counts map, legend and agenda list are
  byte-identical apart from indentation (`git diff -w`). `WeekNav` became a client component
  that keeps the current search params, so the mode survives week navigation and reloads.
  Meetings: `EntryForm` `meetingOnly` (hidden `is_group_meeting=on`, `visibility=details`,
  same action and schema); `GroupMeetings` on Equipo ("Programar reunión" + the week's
  meetings with author; edit/delete only on `is_own`, RLS already limits writes to the
  owner). iCal: `SharedCalendarLink` at the bottom of Equipo (copy, regenerate kept, webcal
  shortcut, Google/Apple/Outlook steps, read-only copy); `MyCalendars` keeps only a pointer.
  RED: 4 `ics-export` tests failed (no `sequenceFrom`, missing fields), `week-layout.test.ts`
  failed (module missing); GREEN: 14 + 9 tests. Checks per commit: eslint clean on changed
  paths, `tsc --noEmit` clean, `npm test` 545 tests passed; final `next build` with dummy
  Supabase env vars succeeded (`/panel/calendario` stays `◐`). Commits: `45a5db5` (feed),
  `f0b09e0` (week view + toggle), `b3253f5` (meetings), `73d3aa8` (iCal link). Visual check:
  the calendar, meeting form and link section rendered with sample data on a temporary
  unauthenticated route (removed, never committed), desktop and 375 px (no page-level
  horizontal scroll). Not verified: the real `/panel/calendario?vista=equipo` page with live
  data (needs Google sign-in), saving a meeting against Supabase, and how each calendar app
  treats the refresh hints (Google ignores them and refreshes on its own schedule).

- T9 audit (2026-11-22, code read of every `src/app/panel/**` page; route: direct inline in a
  side session, the user prefers sessions over subagents). Long flat lists found:
  | Page | Where | Problem | Change |
  | --- | --- | --- | --- |
  | Home | whole page | six stacked full-width sections, long scroll | 2-column grid on `lg` |
  | Home | Mis recordatorios | every reminder, unbounded | first 4 + "Ver más" |
  | Calendario · Equipo | Agenda de la semana | one row per item per person per day (Google busy blocks of 5 people: easily 40+ rows) | day cards in a grid, first 4 per day + "Ver más" |
  | Calendario · Equipo | Huecos en los que estáis todos | one row per free range (dozens) | one row per day with time chips |
  | Calendario · Equipo | Notas del equipo | unbounded | first 4 + "Ver más" |
  | Calendario · Equipo | legend | long paragraph always open | collapsible «¿Cómo se lee?» |
  | Calendario · Mi disponibilidad | Tus entradas | unbounded | first 5 + "Ver más" |
  | Eventos | Pasados | grows forever | first 5 + "Ver más" |
  | Eventos · detalle | Asistentes | 100+ rows per event | first 10 + "Ver más" |
  | Publicaciones | list view | one flat list of every post | grouped by month (newest first), «Sin fecha» last |
  | Tareas | table | done tasks mixed with open ones | "Hecho" rows collapsed behind a toggle |
  Fine as they are: Recursos (already grouped by category), Sugerencias (status tabs), Correo
  (paged mail client), Bóveda (cards behind the vault password), Ajustes (five members),
  Formularios (few). Not touched on purpose: the help paragraph of «Tu semana» lives in
  `src/app/panel/calendario/page.tsx`, which the performance session and the unmerged
  `fix/calendario-equipo-bloques` branch both edit; `team-week-calendar.tsx` likewise.

- T9 changes and evidence: commits `abdee62` (ShowMore with `aria-expanded`/`aria-controls`,
  EmptyState, HelpDetails on native `<details>`, `groupBy` with tests: RED module missing, GREEN
  3 tests), `8d4092e` (home 2-column grid on `lg`, reminders first 4), `26b8f19` (Equipo agenda
  as day cards with "Hoy" and who/when first, title only when shared; free slots one row per day
  with chips; notes, own entries and group meetings bounded; legend help collapsible),
  `22469ba` (past events first 5, attendees first 10), `5b96d20` (posts grouped by month in the
  existing order, past months collapsed, undated last), `cc3ecbf` (done tasks collapsed behind
  "Mostrar N tareas hechas"). Checks per commit: eslint clean on changed paths, `tsc --noEmit`
  clean (after `next typegen`), `npm test` 548 passed. Visual check on a temporary unauthenticated
  route with sample data (removed, never committed): desktop dark and 375 px light, no
  page-level horizontal scroll, toggles flip `aria-expanded` and item counts (4→5, 8→10 rows);
  public `/` renders at 375 px without horizontal scroll. Not verified: the real panel pages with
  live data (Google sign-in), the posts month grouping on screen (reasoned from code), and the
  final `next build` (pending: usage limit reached).

## Next step

Open the PR into `main`; after merge, check the first `cron/diario` log for `reminders`.
T7: review `feat/calendario-equipo` on the Vercel preview (Equipo tab, both modes, schedule a
test meeting and see it in a subscribed calendar), then open its PR.

- T8 (route: inline; worktree `core-team-app-perf`). Before: every panel route's static shell was
  1,873 bytes holding only "Cargando…" (the layout's Suspense wrapped the whole AppShell behind
  the session read); team calendar critical path ~5 sequential Supabase round trips (claims →
  member → week batch → per-member staleness RPC → per-member busy read). After: the AppShell
  (nav) renders outside the member gate, so the static shell of `/panel`, `/panel/calendario`,
  `/panel/tareas`, `/panel/correo` is ~25 KB with full navigation; nav `usePathname()` sits
  behind Suspense (required for dynamic `[id]` routes). Panel reads (`getCurrentMember`, week
  data, feeds, export URL, tasks, events, posts, metrics, reminders, suggestions, links, Drive
  folder id) are `"use cache: private"` + `cacheLife("minutes")`: browser-only per-session
  cache, never a shared server cache, so no cross-member leaks; all mutating actions already
  call `revalidatePath`/`updateTag`, which clears the client cache for the actor. Shared
  server `use cache` was not used: it would need a non-cookie (admin) client, outside the
  AGENTS.md allowlist (decision for the user). Inbox: private, 60 s stale (docs: not kept in
  any server cache across production requests; out of the App Shell, so IMAP runs only on
  open). Busy blocks: one batched read in parallel with the rest of the week; the staleness
  check moved into `after()` with the admin client (`refreshStaleFeedsAfterResponse`), so the
  team week is 1 round trip after the member read. Nav links use `prefetch={true}` for
  calendario/tareas/eventos/publicaciones/recursos (`navPrefetch`), default for the rest.
  RED→GREEN: `busy-rows.test.ts`, `nav-prefetch.test.ts` (missing modules, then 7 pass);
  `busy.test.ts` rewritten. Checks: eslint clean, `tsc --noEmit` clean, `npm test` 67 files /
  553 tests, `next build` green. NOT verified at runtime (no Google sign-in; a mock Supabase
  harness was started but not run) — private-cache behavior must be checked in a preview.
