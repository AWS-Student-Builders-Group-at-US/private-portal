-- T3: public QR check-in. Attendees register from /checkin/<token>; the server
-- writes their rows with the secret key, so there are no insert/update
-- policies for anyone. Members can read and delete attendees.

-- Events: check-in token (128 random bits, hex) and open/closed switch -------
-- The default is volatile, so existing rows each get their own token.

alter table public.events
  add column checkin_token text not null unique
    default replace(gen_random_uuid()::text, '-', ''),
  add column checkin_open boolean not null default false;

-- Attendees ------------------------------------------------------------------

create table public.attendees (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  name text not null,
  email text not null check (email = lower(email)),
  photo_consent boolean not null default false,
  email_consent boolean not null default false,
  consent_version text not null,
  checked_in_at timestamptz not null default now(),
  constraint attendees_event_email_key unique (event_id, email)
);

create index attendees_event_id_idx on public.attendees (event_id);

alter table public.attendees enable row level security;

-- Defense in depth: only the server (secret key) writes attendees.
revoke insert, update on public.attendees from anon, authenticated;

create policy "attendees_select_for_members"
  on public.attendees for select to authenticated
  using ((select public.is_member()));

create policy "attendees_delete_for_members"
  on public.attendees for delete to authenticated
  using ((select public.is_member()));

-- Check-in rate limiting (server-only) --------------------------------------
-- Stores salted SHA-256 hashes of client IPs, never raw IPs.

create table public.checkin_attempts (
  id bigint generated always as identity primary key,
  ip_hash text not null,
  created_at timestamptz not null default now()
);

create index checkin_attempts_ip_hash_created_at_idx
  on public.checkin_attempts (ip_hash, created_at);

alter table public.checkin_attempts enable row level security;
-- No policies: only the secret key can read or write.
revoke all on public.checkin_attempts from anon, authenticated;
