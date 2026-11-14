# Plataforma Core Team

Locator: `odd/tasks/plataforma-core-team.md` · Engram mirror: `odd/plataforma-core-team/tasks`

## Objective

Web app for the AWS Student Builder Group (US, Reina Mercedes): an internal panel for the Core Team
(events with QR check-in, tasks, availability, links, suggestions, posts control, shared credentials
vault) and a public landing page with news.

## Problem and why

The team coordinates through WhatsApp, an availability Excel and scattered links/passwords. The first
talk needs a QR attendance flow with consent. Five users, one organization.

## Scope and constraints

- Single Next.js (App Router, TypeScript) app on Vercel Hobby + Supabase Free. No separate backend.
- Google-only login; only emails in `members` get access. RLS on every table via `is_member()`.
- `service_role` key only on the server (public QR check-in only).
- All accounts owned by the group's Google account. Public GitHub repo (Vercel Hobby limitation).
- Free plans only. Deadline for P0: 2026-11-21.
- UI text in Spanish; code, comments and identifiers in English.
- Full proposal: claude.ai doc "Plataforma interna Core Team".

## Delivery decision (2026-11-14)

The user pushes the repo to the group's GitHub organization with their own account once the app
is finished, and deploys then. Commit author email stays as is (user's decision). Until then all
work stays local on `feat/t1-base`.

## Delivery strategy

`ask-on-risk`. Forecast: well above 400 authored lines over the feature → one PR per day/task.

## Tasks

- [ ] T1 (2026-11-15) Base: Next.js + Supabase SSR, Google login, `members` + `is_member()` + RLS,
      access gate (no-access page), app shell (sidebar desktop / bottom bar mobile), Vercel-ready.
- [x] T2 (2026-11-16) Events CRUD + private Storage files.
- [x] T3 (2026-11-17) Public QR check-in with consents + attendee count + QR PNG.
- [ ] T3b Editable, versioned check-in form from the panel (user decision 2026-11-14): labels for
      name and email (fixed keys, needed for dedupe), extra fields not decided yet (text, email,
      select, checkbox), consent checkboxes (photo/email keys + custom), intro text and privacy
      notice. Each save creates a new version; attendees store the version id and extra answers
      (jsonb). One active form shared by all events.
- [ ] T4 (2026-11-18) Tasks board with assignee, due date, event link.
- [ ] T5 (2026-11-19) Availability: weekly template, overrides, team view.
- [ ] T6 (2026-11-20) Links, suggestions, home dashboard.
- [ ] T7 (2026-11-21) Team test, fixes, RLS review with a non-member account.
- [x] T1b (before T2) Move the member panel from `/` to `/panel` so `/` can host the public landing.
      Reason: new requirement (public landing page) added 2026-11-14.
- [ ] P1 Posts control: `posts` table, draft → in review → approved → published, approval by a
      different member, targets web/LinkedIn/Instagram, public `public-media` bucket.
- [ ] P1 Public landing (`/`) + news (`/noticias`, `/noticias/[slug]`) from approved web posts whose
      date has passed (anon RLS read); public events via `events.is_public`. Structure inspired by
      asociacioniacus.es; visual identity from the AWS assets generator.
- [ ] P1/P2 (later) Vault, Google iCal calendars, Gmail emails.
- [ ] P2 Auto-publish approved posts to LinkedIn/Instagram via GetLate (server-only API key;
      Instagram must be a professional account; free plan ~10–20 posts/month).

## Work split (2026-11-14)

Iván owns configuration and deployment; José takes slightly more than half of the remaining tasks.

| Owner | Tasks |
| --- | --- |
| Iván | C0 config and deploy (GitHub repo public, Vercel, Supabase, Google OAuth, env vars, migrations, private seed, `.env.example`, `checkin_attempts` retention cleanup) · T3b editable check-in form · Vault · Google iCal calendars (exposes `getBusyBlocks(email, range)` for T5) · Gmail emails |
| José | T4 tasks board · T5 availability (consumes `getBusyBlocks` when ready) · T6 links, suggestions, panel home · Posts control · Public landing + news · GetLate auto-publish |
| Both | T7 team test and RLS review with a non-member account |

Workflow for two people:

- Branch per task from an up-to-date `main` (`feat/<task>`), one PR per task, rebase before merging.
- Each feature lives in its own `src/features/<feature>/` and `src/app/panel/<route>/`; shared files
  (`nav-items.ts`, `README.md`, `AGENTS.md`, `package.json`) get small, separate edits.
- Migrations: `supabase/migrations/<YYYYMMDDHHMMSS>_<feature>.sql` with the real creation time; never
  edit a migration that is already on `main`, add a new one.
- Every new table: RLS on with `(select public.is_member())`; public reads only through explicit
  policies; the secret key only in `src/lib/supabase/admin.ts`.

### T1 acceptance criteria

- `npm run build` and `npm run lint` pass.
- Signed-out user → `/login`; signed-in non-member → `/no-access`; member → app shell.
- Migration creates `members` (RLS on) and `is_member()`; members can read members; no client writes.
- `.env.example` lists required variables; no secrets committed.

## Progress and evidence

- T1: implemented, commit `6b76606` on `feat/t1-base`. Route: delegated direct (writer trigger:
  2+ non-trivial files).
  - Next.js 16.4.6 (`src/proxy.ts`, Cache Components on), `@supabase/ssr` 0.12.
  - `npm run lint`: pass (writer + parent spot check). Build with placeholder env: pass (writer).
  - Test-first exception: no runnable deterministic test for OAuth/RLS without a Supabase project.
  - Pending: `.env.example` (writing `.env*` is blocked by permission settings; the user creates it).
  - Not verified against a real Supabase project yet (needs account setup).
  - RDD: assessed `high` (`review_due: high_risk`); review preflight stopped with
    `managed_assets_outdated`; user declined review for this candidate (no sync run).
- T1b: done, commit `e8e9731`. Panel under `/panel`, public placeholder at `/`, proxy only gates
  `/panel/*`. Route: delegated direct (same writer as T2).
- T2: done, commit `755d63b`. `events`, `event_files`, private `event-files` bucket (50 MB) with
  member-only RLS/Storage policies (parent reviewed the migration). Browser uploads straight to
  Storage; metadata via server action.
  - RED observed (modules missing), GREEN `npm test` 15/15 (writer + parent spot check).
  - `npm run lint` and placeholder build: pass (writer). ~1,400 authored lines (scope needed it).
  - Vitest pinned to 3.2.x (local npm 9.9.4 fails resolving vitest 4+).
  - Not verified against a real Supabase project (RLS, Storage, signed URLs).
  - RDD: not run; the review preflight stops on `managed_assets_outdated` and the user declined
    `gentle-ai sync` earlier.
- T3: implemented (writer), not committed yet: the commit was blocked because a hook rewrites
  the git command and auto mode refused it. `npm test` 33/33 (parent spot check), lint, tsc and
  placeholder build pass (writer). Parent checked the migration: RLS on `attendees` (members
  select/delete only, insert/update revoked) and `checkin_attempts` (no access). Follow-ups:
  `checkin_attempts` retention cleanup; review `/privacidad` text and controller before the first
  event; `npm audit` reports 16 findings (mostly vitest 3 dev deps).
- Engram mirror: pending (save call could not be reviewed by auto mode).

## Next step

User creates `.env.example`; account setup by Guille
(`coordinacion/setup-plataforma.md` outside the repo); then T2.
