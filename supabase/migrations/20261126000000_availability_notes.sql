-- Shared availability notes ("No puedo presencial", "Solo online", …) that
-- members draw over their week grid in /panel/calendario.
--
-- A note is a rectangle: every Europe/Madrid date from start_date to end_date
-- (inclusive), between start_minute and end_minute (minutes since midnight)
-- on each of those dates. The app writes grid slot boundaries (30 minutes).
--
-- Every member can read everyone's notes (team view); each member can only
-- insert, update and delete their own rows.
--
-- Backward compatible: a new table only. The legacy availability_template and
-- availability_override tables stay in place (no longer read by the app).

create table public.availability_notes (
  id uuid primary key default gen_random_uuid(),
  member_email text not null references public.members (email)
    on update cascade on delete cascade,
  start_date date not null,
  end_date date not null,
  start_minute integer not null check (start_minute between 0 and 1440),
  end_minute integer not null check (end_minute between 0 and 1440),
  title text not null check (char_length(title) between 1 and 120),
  body text not null default '' check (char_length(body) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint availability_notes_dates_in_order check (end_date >= start_date),
  constraint availability_notes_dates_span check (end_date - start_date < 366),
  constraint availability_notes_minutes_in_order check (end_minute > start_minute)
);

create index availability_notes_dates_idx
  on public.availability_notes (start_date, end_date);
create index availability_notes_member_idx
  on public.availability_notes (member_email);

-- public.set_updated_at() comes from the events migration.
create trigger availability_notes_set_updated_at
  before update on public.availability_notes
  for each row
  execute function public.set_updated_at();

alter table public.availability_notes enable row level security;

-- No anonymous access. Members may only change the rectangle and the text of
-- a note: owner, id and timestamps are not updatable.
revoke all on public.availability_notes from anon;
revoke update on public.availability_notes from authenticated;
grant select, insert, delete on public.availability_notes to authenticated;
grant update (start_date, end_date, start_minute, end_minute, title, body)
  on public.availability_notes to authenticated;

create policy "availability_notes_select_for_members"
  on public.availability_notes for select to authenticated
  using ((select public.is_member()));

create policy "availability_notes_insert_own"
  on public.availability_notes for insert to authenticated
  with check (
    (select public.is_member())
    and member_email = (select lower(auth.jwt() ->> 'email'))
  );

create policy "availability_notes_update_own"
  on public.availability_notes for update to authenticated
  using (
    (select public.is_member())
    and member_email = (select lower(auth.jwt() ->> 'email'))
  )
  with check (
    (select public.is_member())
    and member_email = (select lower(auth.jwt() ->> 'email'))
  );

create policy "availability_notes_delete_own"
  on public.availability_notes for delete to authenticated
  using (
    (select public.is_member())
    and member_email = (select lower(auth.jwt() ->> 'email'))
  );
