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

## Next step

Open the PR into `main`; after merge, check the first `cron/diario` log for `reminders`.
