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
   and run them in filename order:
   1. `20261115000000_members.sql`
   2. `20261116000000_events.sql` (also creates the private `event-files` Storage bucket)
   3. `20261117000000_checkin.sql`
   4. `20261118000000_checkin_forms.sql`
   5. `20261118120000_tasks.sql`
   6. `20261119000000_vault.sql`
   7. `20261119010000_calendars.sql`
   8. `20261119020000_emails.sql`
   9. `20261119150000_availability.sql`
   10. `20261120000000_links_suggestions.sql`
   11. `20261123000000_calendar_weights.sql`
   12. `20261124000000_suggestions_signed.sql`
   13. `20261124010000_member_admin.sql`
   14. `20261125000000_app_settings.sql`
4. **Seed the members privately.** Use `supabase/seed.example.sql` as a template, replace the
   placeholders with the real (lowercase) emails directly in the SQL editor and run it. Do not
   commit the real seed (`supabase/seed.sql` is git-ignored). After that, members manage the list from
   `/panel/ajustes`.
5. **Configure Vercel.** Import the repo and set these environment variables. *Public* values
   are embedded in the browser bundle; *secret* values are server-only and must never get a
   `NEXT_PUBLIC_` prefix.

   | Variable | Kind | Purpose |
   | --- | --- | --- |
   | `NEXT_PUBLIC_SUPABASE_URL` | public | Supabase project URL |
   | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | public | Supabase publishable key |
   | `NEXT_PUBLIC_SITE_URL` | public | Production base URL for QR and unsubscribe links (required to send emails) |
   | `SUPABASE_SECRET_KEY` | secret | Secret key from *Project Settings → API Keys*; read only by `src/lib/supabase/admin.ts` |
   | `CHECKIN_IP_SALT` | secret | Random string used to hash client IPs for rate limiting |
   | `GMAIL_USER` | secret | Sender Gmail address (see *Community emails*) |
   | `GMAIL_APP_PASSWORD` | secret | Gmail app password for that account |
   | `CRON_SECRET` | secret | Random string (at least 16 characters); Vercel sends it to the daily cron |
   | `GOOGLE_SERVICE_ACCOUNT_KEY` | secret | Service account JSON key, base64-encoded (see *Drive folder in Recursos*) |
   | `GOOGLE_DRIVE_FOLDER_ID` | secret | Optional fallback Drive folder id when none is set in Ajustes |
6. **Add redirect URLs.** In Supabase *Authentication → URL Configuration*, set the Site URL to
   the production URL and add these redirect URLs:
   - `https://<your-app>.vercel.app/auth/callback`
   - `http://localhost:3000/auth/callback`
7. **Run the post-deploy smoke tests** below.

## Access model

- The member panel lives under `/panel`. `/` is a public placeholder for the future landing page.
- Signed-out users visiting `/panel/*` are redirected to `/login` by `src/proxy.ts`; every other
  path (`/`, `/login`, `/auth/*`, `/no-access`, future `/noticias*`, `/checkin/*` and `/baja/*`) is public.
- After sign-in (and when a signed-in user opens `/login`) users land on `/panel`.
- Signed-in users whose email is not in `public.members` are redirected to `/no-access`.
- Row Level Security is enabled on every table; `public.is_member()` is the access check.
- `/panel/ajustes` groups the settings. Members add, edit and remove panel accounts there through
  the `add_member`, `update_member` and `remove_member` security definer functions (members only
  read `public.members` directly). Nobody can remove themselves or the last member. Removing a
  member deletes only their own votes, availability and calendars; their tasks become unassigned
  and their suggestions stay, shown as "Antiguo miembro". Suggestions are always signed.
- `/checkin/<token>` is the public QR check-in page and `/privacidad` its privacy notice. Both are
  outside the gate. Check-in writes attendees with the server-only secret key
  (`src/lib/supabase/admin.ts`), rate-limited per hashed IP (5 per minute).
- Members edit the check-in form and its privacy notice at `/panel/mas/formulario-qr`. Each publish
  creates a new immutable version (`public.checkin_forms`); each attendee stores the version they
  accepted. `/privacidad?v=N` shows an older version. Version 1 contains placeholders (data
  controller, contact email) that must be completed before the first real event.
- `/panel/boveda` is the shared credentials vault. It is zero-knowledge: a shared vault passphrase
  derives an AES-256-GCM key in the browser (PBKDF2-SHA-256, 600,000 iterations; see
  `src/features/vault/crypto.ts`), and Supabase stores only ciphertexts (`public.vault_items`) plus
  the salt and a verifier (`public.vault_meta`). Item names and categories are stored in plaintext.
  The key lives only in memory and the vault locks after 10 minutes without interaction. A lost
  vault passphrase cannot be recovered. Changing it re-encrypts every item and calls
  `public.rotate_vault()` in one transaction.
- Calendars ("Mis calendarios de Google" on `/panel/calendario`; `/panel/perfil` redirects
  there): members paste the Google Calendar *secret address in iCal format* of up to 5
  calendars, each with a weight (1 = can't move it, 0.5 = could move it). Only `https://calendar.google.com/calendar/ical/…` URLs are fetched
  (8 s timeout, 5 MB cap, no off-host redirects). The server stores only busy intervals
  and their feed weight (`calendar_busy_blocks`, readable by all members, refreshed when older
  than 15 minutes, window ±30 days); the secret URLs are readable only by their owner. `/api/calendario.ics?token=…` is a public,
  per-member token feed of the team events for Google Calendar subscriptions.
- `/api/cron/diario` is the daily maintenance job (see *Daily maintenance*); it only answers
  requests carrying `Authorization: Bearer $CRON_SECRET`.
- `/baja/<token>` is the public unsubscribe page for community emails (outside the gate,
  `noindex`). Opening it never unsubscribes; the visitor confirms with a button. Mail clients use
  the RFC 8058 one-click endpoint `POST /api/baja/<token>` from the `List-Unsubscribe` header.

## Drive folder in Recursos

`/panel/recursos` lists one Google Drive folder (and its subfolders, via `?carpeta=<id>`) for every
member, without making the folder public. The server reads it with a Google **service account**
(`src/features/drive`, server-only, scope `drive.readonly`); the key never reaches the browser.
Listings are cached for 5 minutes; «Actualizar» refreshes them. Members still need their own Drive
access to open the files.

The folder is chosen in **Ajustes → Carpeta de Drive (Recursos)** (stored in
`app_settings.drive_folder_id`); `GOOGLE_DRIVE_FOLDER_ID` is only a fallback.

1. In Google Cloud Console, open the group's project and enable the **Google Drive API**
   (*APIs & Services → Library*).
2. Create a service account (*IAM & Admin → Service Accounts → Create*). It needs no project roles.
3. Open it, go to *Keys → Add key → Create new key → JSON* and download the file.
4. Encode it on one line: `base64 -w0 key.json` (macOS: `base64 -i key.json`). Store the output as
   the secret `GOOGLE_SERVICE_ACCOUNT_KEY` in Vercel (and in `.env.local` for development), then
   delete the downloaded file. Never commit it.
5. The folder owner shares the folder with the service account email
   (`<name>@<project>.iam.gserviceaccount.com`) as **Viewer**. The folder stays private.
6. Redeploy, then paste the folder link (`https://drive.google.com/drive/folders/<id>`) in
   Ajustes. The card shows whether the service account can read it.

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

## Daily maintenance

`vercel.json` schedules `GET /api/cron/diario` once a day at 04:00 UTC (Vercel Hobby allows at
most one run per day). When `CRON_SECRET` is set, Vercel sends it as
`Authorization: Bearer <CRON_SECRET>`; any other request gets `401`, and if the variable is
missing every request is rejected. The job:

- deletes `checkin_attempts` rows (hashed IPs) older than 24 hours;
- makes a small read so the Supabase Free project does not pause for inactivity;
- refreshes every member's Google calendar busy blocks, in parallel within a time budget.

It returns `{ ok, deletedAttempts, refreshedMembers, failedMembers }` and logs counts only.

## Post-deploy smoke tests

Run these against the production URL after each deployment that changes auth, migrations or
environment variables:

1. **Member login:** sign in with Google using a member email and land on `/panel`.
2. **Non-member blocked:** sign in with an email not in `public.members` and land on `/no-access`.
3. **Event and file:** create an event and upload, download and delete a file on it.
4. **QR check-in from a phone:** scan the event QR on mobile data, submit the form and see the
   attendee in the panel.
5. **Vault:** create the vault (or unlock it), add an item and unlock it again after reload.
6. **Calendar feed:** add your Google iCal secret address in "Mis calendarios de Google" on
   `/panel/calendario`, check your busy blocks in the week grid above it, and subscribe to the exported team feed in Google Calendar.
7. **Test email to yourself:** before any real attendee consents, check in to a test event with
   your own email and the email consent ticked, send an announcement, and check the footer and
   unsubscribe link.
8. **Cron rejects strangers:** `curl -i https://<your-app>.vercel.app/api/cron/diario` without the
   header returns `401`. Use *Run* on the cron job in the Vercel dashboard to check a real run.
