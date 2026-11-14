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

Checks: `npm test` (Vitest, pure logic only), `npm run lint` and `npm run build`.

## Setup

1. **Create the Supabase project** (Free plan). From *Project Settings → API Keys*, copy the
   project URL and the publishable key.
2. **Enable Google sign-in.** Create an OAuth client (Web application) in Google Cloud Console,
   add `https://<project-ref>.supabase.co/auth/v1/callback` as an authorized redirect URI, then
   enable the Google provider in *Authentication → Sign In / Providers* with that client ID and
   secret.
3. **Run the migrations.** Paste each file in `supabase/migrations/` into the Supabase SQL editor
   and run them in filename order (`*_members.sql`, then `*_events.sql`, which also creates the
   private `event-files` Storage bucket, then `*_checkin.sql`, then `*_emails.sql`).
4. **Seed the members privately.** Use `supabase/seed.example.sql` as a template, replace the
   placeholders with the real (lowercase) emails directly in the SQL editor and run it. Do not
   commit the real seed (`supabase/seed.sql` is git-ignored).
5. **Configure Vercel.** Import the repo and set these environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - `SUPABASE_SECRET_KEY` (server-only secret key from *Project Settings → API Keys*; used only by
     the public check-in flow and community emails; never prefix it with `NEXT_PUBLIC_`)
   - `CHECKIN_IP_SALT` (server-only random string used to hash client IPs for rate limiting)
   - `NEXT_PUBLIC_SITE_URL` (base URL for check-in QR links, defaults to the request origin;
     required to send community emails)
   - `GMAIL_USER` and `GMAIL_APP_PASSWORD` (server-only; see *Community emails*)
6. **Add redirect URLs.** In Supabase *Authentication → URL Configuration*, set the Site URL to
   the production URL and add these redirect URLs:
   - `https://<your-app>.vercel.app/auth/callback`
   - `http://localhost:3000/auth/callback`

## Access model

- The member panel lives under `/panel`. `/` is a public placeholder for the future landing page.
- Signed-out users visiting `/panel/*` are redirected to `/login` by `src/proxy.ts`; every other
  path (`/`, `/login`, `/auth/*`, `/no-access`, future `/noticias*`, `/checkin/*` and `/baja/*`) is public.
- After sign-in (and when a signed-in user opens `/login`) users land on `/panel`.
- Signed-in users whose email is not in `public.members` are redirected to `/no-access`.
- Row Level Security is enabled on every table; `public.is_member()` is the access check.
- `/checkin/<token>` is the public QR check-in page and `/privacidad` its privacy notice. Both are
  outside the gate. Check-in writes attendees with the server-only secret key
  (`src/lib/supabase/admin.ts`), rate-limited per hashed IP (5 per minute). The privacy notice
  contains placeholders that must be reviewed before the first real event.
- `/baja/<token>` is the public unsubscribe page for community emails (outside the gate,
  `noindex`). Opening it never unsubscribes; the visitor confirms with a button. Mail clients use
  the RFC 8058 one-click endpoint `POST /api/baja/<token>` from the `List-Unsubscribe` header.

## Community emails

From an event page, members send an announcement to everyone whose most recent check-in has the
email consent ticked and who has not unsubscribed. Each person gets an individual email (no
CC/BCC) from the group's Gmail, with a footer explaining why they receive it and an unsubscribe
link. Sending runs in chunks of 25 per server action (Vercel time limits) and an interrupted send
can be resumed without emailing anyone twice (`email_deliveries` is unique per campaign and
recipient). A daily cap of 450 recipients in 24 h keeps the account under Gmail's ~500/day limit.

Server-only environment variables (never `NEXT_PUBLIC_*`):

- `GMAIL_USER` — the group's Gmail address used as sender.
- `GMAIL_APP_PASSWORD` — a Gmail app password for that account (requires 2-Step Verification).
- `NEXT_PUBLIC_SITE_URL` is required for sending: unsubscribe links are built from it.
