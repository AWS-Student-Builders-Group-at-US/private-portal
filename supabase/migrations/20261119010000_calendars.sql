-- T5: Google Calendar busy times (secret iCal feeds) and the team events
-- subscription feed. Secret feed URLs are only visible to their owner; other
-- members only see busy intervals (no titles, descriptions or locations).

-- Calendar feeds (owner-only) ------------------------------------------------

create table public.calendar_feeds (
  id uuid primary key default gen_random_uuid(),
  member_email text not null
    references public.members (email) on update cascade on delete cascade,
  label text not null check (char_length(label) between 1 and 60),
  -- Defense in depth for the app-side SSRF allowlist.
  ics_url text not null
    check (ics_url like 'https://calendar.google.com/calendar/ical/%'),
  last_fetched_at timestamptz,
  last_error text,
  created_at timestamptz not null default now()
);

create index calendar_feeds_member_email_idx on public.calendar_feeds (member_email);

alter table public.calendar_feeds enable row level security;

-- Members add and remove their own feeds; fetch status is written by the
-- server (secret key), so there is no update grant.
revoke update on public.calendar_feeds from anon, authenticated;

create policy "calendar_feeds_select_own"
  on public.calendar_feeds for select to authenticated
  using (
    member_email = lower(auth.jwt() ->> 'email') and (select public.is_member())
  );

create policy "calendar_feeds_insert_own"
  on public.calendar_feeds for insert to authenticated
  with check (
    member_email = lower(auth.jwt() ->> 'email') and (select public.is_member())
  );

create policy "calendar_feeds_delete_own"
  on public.calendar_feeds for delete to authenticated
  using (
    member_email = lower(auth.jwt() ->> 'email') and (select public.is_member())
  );

-- True when any of that member's feeds was never fetched or is older than
-- `max_age`. Lets any member decide whether to refresh someone else's busy
-- times without being able to read their feed URLs.
create or replace function public.calendar_feeds_need_refresh(
  p_email text,
  p_max_age interval
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_member() and exists (
    select 1
    from public.calendar_feeds f
    where f.member_email = lower(p_email)
      and (f.last_fetched_at is null or f.last_fetched_at < now() - p_max_age)
  );
$$;

revoke execute on function public.calendar_feeds_need_refresh(text, interval)
  from public, anon;
grant execute on function public.calendar_feeds_need_refresh(text, interval)
  to authenticated;

-- Busy blocks (times only, readable by all members) -------------------------

create table public.calendar_busy_blocks (
  id bigint generated always as identity primary key,
  member_email text not null
    references public.members (email) on update cascade on delete cascade,
  feed_id uuid not null references public.calendar_feeds (id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  constraint calendar_busy_blocks_ends_after_starts check (ends_at > starts_at)
);

create index calendar_busy_blocks_member_starts_idx
  on public.calendar_busy_blocks (member_email, starts_at);
create index calendar_busy_blocks_feed_id_idx on public.calendar_busy_blocks (feed_id);

alter table public.calendar_busy_blocks enable row level security;

-- Only the server (secret key) writes busy blocks.
revoke insert, update, delete on public.calendar_busy_blocks from anon, authenticated;

create policy "calendar_busy_blocks_select_for_members"
  on public.calendar_busy_blocks for select to authenticated
  using ((select public.is_member()));

-- Export tokens for the team events feed (owner-only) ------------------------
-- 128 random bits as 32 hex chars. Created and rotated only through the
-- security definer functions below.

create table public.calendar_export_tokens (
  member_email text primary key
    references public.members (email) on update cascade on delete cascade,
  token text not null unique check (token ~ '^[0-9a-f]{32}$'),
  created_at timestamptz not null default now()
);

alter table public.calendar_export_tokens enable row level security;

revoke insert, update, delete on public.calendar_export_tokens from anon, authenticated;

create policy "calendar_export_tokens_select_own"
  on public.calendar_export_tokens for select to authenticated
  using (
    member_email = lower(auth.jwt() ->> 'email') and (select public.is_member())
  );

-- Returns the caller's token, creating it on first use.
create or replace function public.ensure_calendar_export_token()
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_email text := lower(auth.jwt() ->> 'email');
  v_token text;
begin
  if not public.is_member() then
    raise exception 'not a member' using errcode = '42501';
  end if;
  insert into public.calendar_export_tokens (member_email, token)
  values (v_email, replace(gen_random_uuid()::text, '-', ''))
  on conflict (member_email) do nothing;
  select t.token into v_token
  from public.calendar_export_tokens t
  where t.member_email = v_email;
  return v_token;
end;
$$;

-- Replaces the caller's token; the previous subscription URL stops working.
create or replace function public.regenerate_calendar_export_token()
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_email text := lower(auth.jwt() ->> 'email');
  v_token text := replace(gen_random_uuid()::text, '-', '');
begin
  if not public.is_member() then
    raise exception 'not a member' using errcode = '42501';
  end if;
  insert into public.calendar_export_tokens (member_email, token)
  values (v_email, v_token)
  on conflict (member_email)
    do update set token = excluded.token, created_at = now();
  return v_token;
end;
$$;

revoke execute on function public.ensure_calendar_export_token() from public, anon;
revoke execute on function public.regenerate_calendar_export_token() from public, anon;
grant execute on function public.ensure_calendar_export_token() to authenticated;
grant execute on function public.regenerate_calendar_export_token() to authenticated;
