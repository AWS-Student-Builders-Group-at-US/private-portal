# Plataforma Core Team

Locator: `odd/tasks/plataforma-core-team.md` · Engram mirror: `odd/plataforma-core-team/tasks`

## Objective

Internal web app for the AWS Student Builder Group (US, Reina Mercedes) Core Team: events with QR
check-in, tasks, availability, links, suggestions and a shared credentials vault.

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
- [ ] T2 (2026-11-16) Events CRUD + private Storage files.
- [ ] T3 (2026-11-17) Public QR check-in with consents + attendee count + QR PNG.
- [ ] T4 (2026-11-18) Tasks board with assignee, due date, event link.
- [ ] T5 (2026-11-19) Availability: weekly template, overrides, team view.
- [ ] T6 (2026-11-20) Links, suggestions, home dashboard.
- [ ] T7 (2026-11-21) Team test, fixes, RLS review with a non-member account.
- [ ] P1/P2 (later) Vault, Google iCal calendars, Gmail emails.

### T1 acceptance criteria

- `npm run build` and `npm run lint` pass.
- Signed-out user → `/login`; signed-in non-member → `/no-access`; member → app shell.
- Migration creates `members` (RLS on) and `is_member()`; members can read members; no client writes.
- `.env.example` lists required variables; no secrets committed.

## Progress and evidence

- T1: in progress. Route: delegated direct (writer trigger: 2+ non-trivial files).

## Next step

T1 implementation, then account setup by Guille (Supabase project, Google OAuth client, Vercel).
