-- Meeting organizers and video call links for group meetings.
--
-- Group meetings (calendar_entries.is_group_meeting, shown to the whole team
-- and in the shared iCal feed) can only be created or edited by meeting
-- organizers: the group's common account (20261129000000_common_account.sql)
-- and the members it marks with `can_schedule_meetings` from /panel/ajustes.
-- No email is written here (public repository): the flag is set at runtime.
-- Organizers can also edit and delete any group meeting, not only their own.
-- Group meetings made before this migration stay as they are.
--
-- Group meetings get an optional `meeting_url` (e.g. a Google Meet link).
--
-- Backward compatible: new columns with defaults, new functions, a trigger,
-- extra policies, and list_calendar_entries() returning one more column
-- (dropped and recreated in this same transaction; callers keep working).

-- Organizers -----------------------------------------------------------------

alter table public.members
  add column can_schedule_meetings boolean not null default false;

-- True when the signed-in user may create and manage group meetings.
create or replace function public.can_schedule_meetings()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_member() and (
    public.is_common_account()
    or exists (
      select 1
      from public.members m
      where m.email = lower(auth.jwt() ->> 'email')
        and m.can_schedule_meetings
    )
  );
$$;

revoke execute on function public.can_schedule_meetings() from public, anon;
grant execute on function public.can_schedule_meetings() to authenticated;

-- Grants or removes the organizer flag. Same guard as the member RPCs: once
-- the common account is configured, only it can call this.
create or replace function public.set_meeting_organizer(p_email text, p_enabled boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.assert_member_manager();
  if p_enabled is null then
    raise exception 'invalid_value';
  end if;

  update public.members
  set can_schedule_meetings = p_enabled
  where email = lower(trim(p_email));

  if not found then
    raise exception 'member_not_found';
  end if;
end;
$$;

revoke execute on function public.set_meeting_organizer(text, boolean) from public, anon;
grant execute on function public.set_meeting_organizer(text, boolean) to authenticated;

-- Meeting link -----------------------------------------------------------------

alter table public.calendar_entries
  add column meeting_url text
    check (
      meeting_url is null
      or (char_length(meeting_url) <= 500 and meeting_url ~* '^https?://')
    );

grant update (meeting_url) on public.calendar_entries to authenticated;

-- Only organizers create or edit group meetings ------------------------------

create or replace function public.check_group_meeting_organizer()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- App users only: dashboard or secret-key writes (and cascades such as a
  -- member's email change run by them) are not blocked.
  if new.is_group_meeting
    and coalesce(auth.jwt() ->> 'role', '') = 'authenticated'
    and not public.can_schedule_meetings() then
    raise exception 'not_meeting_organizer' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger calendar_entries_group_meeting_organizer
  before insert or update on public.calendar_entries
  for each row
  execute function public.check_group_meeting_organizer();

-- Group meetings always carry details (see calendar_entries_group_meeting_details),
-- so every member may read them directly; organizers may edit and delete
-- any of them. These policies add to the existing "own rows" ones.
create policy "calendar_entries_select_group_meetings"
  on public.calendar_entries for select to authenticated
  using ((select public.is_member()) and is_group_meeting);

create policy "calendar_entries_update_group_meetings_for_organizers"
  on public.calendar_entries for update to authenticated
  using ((select public.can_schedule_meetings()) and is_group_meeting)
  with check ((select public.can_schedule_meetings()) and is_group_meeting);

create policy "calendar_entries_delete_group_meetings_for_organizers"
  on public.calendar_entries for delete to authenticated
  using ((select public.can_schedule_meetings()) and is_group_meeting);

-- list_calendar_entries() with the meeting link --------------------------------

drop function public.list_calendar_entries(timestamptz, timestamptz);

create function public.list_calendar_entries(p_from timestamptz, p_to timestamptz)
returns table (
  id uuid,
  member_email text,
  title text,
  notes text,
  starts_at timestamptz,
  ends_at timestamptz,
  visibility text,
  is_group_meeting boolean,
  is_own boolean,
  meeting_url text
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
    coalesce(e.member_email = c.email, false),
    case when e.member_email = c.email or e.visibility = 'details' or e.is_group_meeting
      then e.meeting_url end
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
