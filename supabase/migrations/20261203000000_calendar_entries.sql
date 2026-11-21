-- Personal calendar entries that members add by hand in /panel/calendario
-- (a record in their own calendar; unrelated to public.events and
-- /panel/eventos). Google calendar data stays busy-only: event titles from
-- Google are never stored; only these hand-made entries carry a title.
--
-- Each entry counts as busy (1) in its owner's availability. `visibility`
-- decides what the other members see:
--   'details' -> title and notes;
--   'busy'    -> only that the owner is busy (title and notes hidden).
-- `is_group_meeting` entries appear in the shared "AWS US - Student Builder
-- Group" iCal feed and are always shown with details (enforced by a check).
--
-- Privacy is enforced in the database: members can SELECT only their own rows
-- directly. Everyone's entries are read through
-- public.list_calendar_entries(), a security definer function that returns
-- title and notes as null for someone else's busy-only entry.
--
-- Backward compatible: a new table and function only.

create table public.calendar_entries (
  id uuid primary key default gen_random_uuid(),
  member_email text not null default lower(auth.jwt() ->> 'email')
    references public.members (email) on update cascade on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  notes text check (notes is null or char_length(notes) <= 2000),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  visibility text not null default 'details' check (visibility in ('details', 'busy')),
  is_group_meeting boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint calendar_entries_times_in_order check (ends_at > starts_at),
  constraint calendar_entries_max_span check (ends_at - starts_at <= interval '1 day'),
  constraint calendar_entries_group_meeting_details
    check (not is_group_meeting or visibility = 'details')
);

create index calendar_entries_member_starts_idx
  on public.calendar_entries (member_email, starts_at);
create index calendar_entries_starts_idx
  on public.calendar_entries (starts_at);
create index calendar_entries_group_meetings_idx
  on public.calendar_entries (starts_at) where is_group_meeting;

-- public.set_updated_at() comes from the events migration.
create trigger calendar_entries_set_updated_at
  before update on public.calendar_entries
  for each row
  execute function public.set_updated_at();

alter table public.calendar_entries enable row level security;

-- No anonymous access. Members may change the content of their own entries:
-- owner, id and timestamps are not updatable.
revoke all on public.calendar_entries from anon;
revoke update on public.calendar_entries from authenticated;
grant select, insert, delete on public.calendar_entries to authenticated;
grant update (title, notes, starts_at, ends_at, visibility, is_group_meeting)
  on public.calendar_entries to authenticated;

-- Direct reads: own rows only (other members go through the function below).
create policy "calendar_entries_select_own"
  on public.calendar_entries for select to authenticated
  using (
    (select public.is_member())
    and member_email = (select lower(auth.jwt() ->> 'email'))
  );

create policy "calendar_entries_insert_own"
  on public.calendar_entries for insert to authenticated
  with check (
    (select public.is_member())
    and member_email = (select lower(auth.jwt() ->> 'email'))
  );

create policy "calendar_entries_update_own"
  on public.calendar_entries for update to authenticated
  using (
    (select public.is_member())
    and member_email = (select lower(auth.jwt() ->> 'email'))
  )
  with check (
    (select public.is_member())
    and member_email = (select lower(auth.jwt() ->> 'email'))
  );

create policy "calendar_entries_delete_own"
  on public.calendar_entries for delete to authenticated
  using (
    (select public.is_member())
    and member_email = (select lower(auth.jwt() ->> 'email'))
  );

-- Every member's entries overlapping [p_from, p_to) (at most 62 days), for
-- the team view. Members only (empty for anyone else). The title and notes of
-- someone else's busy-only entry are returned as null; group meetings always
-- carry details (see the check constraint above, repeated here).
create or replace function public.list_calendar_entries(p_from timestamptz, p_to timestamptz)
returns table (
  id uuid,
  member_email text,
  title text,
  notes text,
  starts_at timestamptz,
  ends_at timestamptz,
  visibility text,
  is_group_meeting boolean,
  is_own boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  with caller as (
    select lower(auth.jwt() ->> 'email') as email
  )
  select
    e.id,
    e.member_email,
    case when e.member_email = c.email or e.visibility = 'details' or e.is_group_meeting
      then e.title end,
    case when e.member_email = c.email or e.visibility = 'details' or e.is_group_meeting
      then e.notes end,
    e.starts_at,
    e.ends_at,
    e.visibility,
    e.is_group_meeting,
    coalesce(e.member_email = c.email, false)
  from public.calendar_entries e
  cross join caller c
  where public.is_member()
    and p_to > p_from
    and p_to - p_from <= interval '62 days'
    and e.starts_at < p_to
    and e.ends_at > p_from
  order by e.starts_at, e.id;
$$;

revoke execute on function public.list_calendar_entries(timestamptz, timestamptz)
  from public, anon;
grant execute on function public.list_calendar_entries(timestamptz, timestamptz)
  to authenticated;
