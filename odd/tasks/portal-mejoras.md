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
- The inbox stays read-only and never stores emails (AGENTS.md); Google event titles are not
  stored today, so showing details needs an explicit privacy decision.

## Tasks

- [x] T1 Speed: the calendar page no longer waits for Google feeds (refresh in the background,
      serve cached blocks); loading skeletons for calendar and mail.
- [x] T2 Panel home: next meeting, upcoming and recently published posts next to tasks and events.
- [x] T3 Public home: when a member has a panel session, show their team photo as a signed-in
      avatar linking to the panel.
- [ ] T4 Calendar redesign (pending product decision): personal events added by hand, per-person
      visibility (details / calendar name / just busy), combined team view with details, shared
      subscribable "AWS US - Student Builder Group" calendar anyone can add meetings to.
- [ ] T5 Posts insights from Zernio (pending: check what the Zernio API exposes).
- [ ] T6 Mail-based reminders (pending decision: conflicts with "never store emails").

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

## Next step

T4 (pending product decision).
