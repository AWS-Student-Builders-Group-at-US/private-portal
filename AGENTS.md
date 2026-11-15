# AGENTS.md

Guidance for humans and coding agents working on this repository.

## Fixed stack

- Next.js (App Router, TypeScript, `src/` dir, `@/*` alias). Next.js 16: request interception
  lives in `src/proxy.ts` (formerly `middleware.ts`). Cache Components is enabled, so request-time
  reads (cookies, session) must sit behind `<Suspense>`.
- Tailwind CSS v4 and shadcn/ui (`npx shadcn@latest add <component>`; add only what you use).
- Supabase via `@supabase/ssr`: browser client `src/lib/supabase/client.ts`, server client
  `src/lib/supabase/server.ts`, session refresh `src/lib/supabase/proxy.ts`. Create clients inside
  functions, never at module scope.
- Deployment: Vercel Hobby + Supabase Free. npm is the package manager.
- Google-only sign-in; access is limited to emails in `public.members`.

## Folder conventions

- `src/app/panel/` — member-only routes (`/panel/*`) behind the access gate
  (`src/lib/auth/member.ts`). Only `/panel/*` requires login (`src/lib/supabase/proxy.ts`).
- `src/app/page.tsx` (`/`), `src/app/login`, `src/app/no-access`, `src/app/auth/callback` — public,
  outside the gate, as do `/checkin/*`, `/baja/*`, `/api/baja/*`, `/api/cron/*` and `/privacidad`. Future public routes (`/noticias*`) also stay outside it.
- `src/features/<feature>/` — code for each future feature (components, server actions, queries).
- `src/components/ui/` — generated shadcn/ui components; `src/components/` — shared app components.
- `supabase/migrations/` — one plain SQL migration per feature, named `<timestamp>_<feature>.sql`.

## Security rules

- The repository is public: never commit secrets, real emails or other personal data.
- Enable RLS on every table; gate access with `public.is_member()`.
- The secret key (`SUPABASE_SECRET_KEY`, formerly `service_role`) is server-only (never
  `NEXT_PUBLIC_*`, never in client code). Only `src/lib/supabase/admin.ts` reads it, and only the
  public check-in flow (`src/features/checkin`, which also serves `/privacidad`), the calendar
  feeds (`src/features/calendars` refresh, `src/app/api/calendario.ics`) and community emails
  (`src/features/emails`: public unsubscribe by token, and server-only tables written after a
  membership check) and the daily maintenance cron (`src/app/api/cron/diario`, authorized by
  `CRON_SECRET`) may use that client. Keep this list in sync with the comment in `admin.ts`.
- Gmail credentials (`GMAIL_USER`, `GMAIL_APP_PASSWORD`) are server-only and only
  `src/features/emails/mailer.ts` reads them. Never log credentials or recipient lists.

## Language

- UI copy in Spanish (neutral, professional).
- Code, identifiers, comments and docs in English.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Branching and delivery

- `main` is production: Vercel deploys every merge to `main`, and the "Database migrations"
  workflow applies new files in `supabase/migrations/` to the production Supabase project.
- Feature branches (`feat/*`, `fix/*`, `chore/*`) start from an up-to-date `main` and open a PR
  into `main`. Vercel builds a preview for every PR; test there before merging.
- Nobody pushes to `main` directly; it requires a PR with the `checks` CI job (lint, tests,
  build) green.
- Migrations must be backward compatible with the code that is still live while Vercel deploys:
  add columns with defaults or new tables; never drop or rename in the same release.
