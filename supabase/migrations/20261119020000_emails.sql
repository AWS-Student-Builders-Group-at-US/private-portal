-- T: community emails. Members send event announcements from the group's
-- Gmail to people who ticked the email consent at check-in. The legal basis
-- is `attendees.email_consent` (with its `consent_version`); the latest
-- check-in per email decides, and unsubscribes always win.
--
-- Writes that must not be forged by a browser (unsubscribe state, delivery
-- log, campaign counters) are done by the server with the secret key, so
-- clients get no insert/update policies on those tables.

-- Mailing preferences (server-only) -------------------------------------------
-- One row per recipient, created on first send. The token (128 random bits,
-- hex) is the only credential of the public /baja/<token> page.

create table public.mailing_preferences (
  email text primary key check (email = lower(email)),
  unsubscribe_token text not null unique
    default replace(gen_random_uuid()::text, '-', '')
    check (unsubscribe_token ~ '^[0-9a-f]{32}$'),
  unsubscribed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.mailing_preferences enable row level security;
-- No policies: tokens are secrets, only the secret key reads or writes them.
revoke all on public.mailing_preferences from anon, authenticated;

-- Campaigns ---------------------------------------------------------------------

create table public.email_campaigns (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references public.events (id) on delete set null,
  subject text not null check (char_length(subject) between 1 and 150),
  body text not null check (char_length(body) between 1 and 5000),
  status text not null default 'sending'
    check (status in ('sending', 'sent', 'partial', 'failed')),
  recipient_count integer not null default 0 check (recipient_count >= 0),
  sent_count integer not null default 0 check (sent_count >= 0),
  sent_by text not null default lower(auth.jwt() ->> 'email'),
  created_at timestamptz not null default now(),
  finished_at timestamptz
);

create index email_campaigns_event_id_idx on public.email_campaigns (event_id);

alter table public.email_campaigns enable row level security;

create policy "email_campaigns_select_for_members"
  on public.email_campaigns for select to authenticated
  using ((select public.is_member()));

-- A member can only create a campaign in their own name, starting at zero.
create policy "email_campaigns_insert_for_members"
  on public.email_campaigns for insert to authenticated
  with check (
    (select public.is_member())
    and sent_by = lower(auth.jwt() ->> 'email')
    and status = 'sending'
    and sent_count = 0
  );

-- Status and counters mirror `email_deliveries`, which only the server
-- writes, so updates and deletes are server-only too (no client policies).
-- Campaigns are kept as a record of what was sent and on what basis.
revoke update, delete on public.email_campaigns from anon, authenticated;
revoke all on public.email_campaigns from anon;

-- Deliveries --------------------------------------------------------------------
-- One row per (campaign, recipient). The server inserts it as `pending`
-- BEFORE sending ("claim"), so concurrent or resumed calls never email the
-- same person twice for a campaign. A `pending` row left by a crash is not
-- retried: at-most-once is preferred over a duplicate email.

create table public.email_deliveries (
  campaign_id uuid not null references public.email_campaigns (id) on delete cascade,
  email text not null check (email = lower(email)),
  status text not null default 'pending'
    check (status in ('pending', 'sent', 'failed')),
  error text check (char_length(error) <= 300),
  sent_at timestamptz not null default now(),
  constraint email_deliveries_campaign_email_key unique (campaign_id, email)
);

-- Daily quota: deliveries in the last 24 h.
create index email_deliveries_sent_at_idx on public.email_deliveries (sent_at);

alter table public.email_deliveries enable row level security;

create policy "email_deliveries_select_for_members"
  on public.email_deliveries for select to authenticated
  using ((select public.is_member()));

revoke insert, update, delete on public.email_deliveries from anon, authenticated;
revoke all on public.email_deliveries from anon;
