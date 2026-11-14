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

## Delivery strategy

`ask-on-risk`. Forecast: well above 400 authored lines over the feature → one PR per day/task.

## Tasks

- [ ] T1 (2026-11-15) Base: Next.js + Supabase SSR, Google login, `members` + `is_member()` + RLS,
      access gate (no-access page), app shell (sidebar desktop / bottom bar mobile), Vercel-ready.
- [x] T2 (2026-11-16) Events CRUD + private Storage files.
- [ ] T3 (2026-11-17) Public QR check-in with consents + attendee count + QR PNG.
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
- Engram mirror: pending (save call could not be reviewed by auto mode).

## Next step

User creates `.env.example`; account setup by Guille
(`coordinacion/setup-plataforma.md` outside the repo); then T2.
