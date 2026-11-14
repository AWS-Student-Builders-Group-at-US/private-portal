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

- `src/app/(app)/` — member-only routes behind the access gate (`src/lib/auth/member.ts`).
- `src/app/login`, `src/app/no-access`, `src/app/auth/callback` — outside the gate.
- `src/features/<feature>/` — code for each future feature (components, server actions, queries).
- `src/components/ui/` — generated shadcn/ui components; `src/components/` — shared app components.
- `supabase/migrations/` — one plain SQL migration per feature, named `<timestamp>_<feature>.sql`.

## Security rules

- The repository is public: never commit secrets, real emails or other personal data.
- Enable RLS on every table; gate access with `public.is_member()`.
- The `service_role` key is server-only (never `NEXT_PUBLIC_*`, never in client code).

## Language

- UI copy in Spanish (neutral, professional).
- Code, identifiers, comments and docs in English.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
