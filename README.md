# Core Team app

Internal web app for the Core Team of the AWS Student Builder Group at Universidad de Sevilla.
It brings events, tasks, availability, links and suggestions into one place for the five
Core Team members. Sign-in is Google-only and access is limited to an email allowlist
(`public.members`).

Stack: Next.js (App Router, TypeScript), Tailwind CSS, shadcn/ui, Supabase (`@supabase/ssr`),
deployed on Vercel Hobby with Supabase Free.

> **Rule:** this repository is public. Secrets (API keys, `service_role`, OAuth client secrets)
> and real personal data (team emails, names) never go into the repo. Use Vercel/Supabase
> settings and `.env.local` (git-ignored) instead.

## Local development

```bash
npm install
cp .env.example .env.local   # then fill in the values
npm run dev
```

Checks: `npm run lint` and `npm run build`.

## Setup

1. **Create the Supabase project** (Free plan). From *Project Settings → API Keys*, copy the
   project URL and the publishable key.
2. **Enable Google sign-in.** Create an OAuth client (Web application) in Google Cloud Console,
   add `https://<project-ref>.supabase.co/auth/v1/callback` as an authorized redirect URI, then
   enable the Google provider in *Authentication → Sign In / Providers* with that client ID and
   secret.
3. **Run the migration.** Paste `supabase/migrations/*_members.sql` into the Supabase SQL editor
   and run it.
4. **Seed the members privately.** Use `supabase/seed.example.sql` as a template, replace the
   placeholders with the real (lowercase) emails directly in the SQL editor and run it. Do not
   commit the real seed (`supabase/seed.sql` is git-ignored).
5. **Configure Vercel.** Import the repo and set the environment variables listed in
   `.env.example` (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`).
6. **Add redirect URLs.** In Supabase *Authentication → URL Configuration*, set the Site URL to
   the production URL and add these redirect URLs:
   - `https://<your-app>.vercel.app/auth/callback`
   - `http://localhost:3000/auth/callback`

## Access model

- Signed-out users are redirected to `/login` by `src/proxy.ts`.
- Signed-in users whose email is not in `public.members` are redirected to `/no-access`.
- Row Level Security is enabled on every table; `public.is_member()` is the access check.
- `/checkin/*` is reserved for a future public QR check-in page and is excluded from the login
  redirect.
