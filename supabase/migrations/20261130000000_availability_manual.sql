-- Manual availability: members edit their own week grid in /panel/calendario.
--
-- One row per edited 30-minute slot of one Europe/Madrid date. `value` is the
-- member's occupation in that slot (0 = free, 0.5 = could move it, 1 = can't
-- move it) and replaces whatever their Google calendars say for that slot;
-- null keeps the Google value. `online_only` marks that the member can only
-- join online in that slot; it complements the value and never changes it.
-- Edits apply to that date only (they do not repeat weekly). A row with no
-- value and no online mark is deleted by the app (the slot follows Google).
--
-- Every member can read everyone's rows (team view); each member can only
-- insert, update and delete their own rows.
--
-- Backward compatible: a new table only.

create table public.availability_manual (
  member_email text not null references public.members (email)
    on update cascade on delete cascade,
  date date not null,
  start_minute integer not null
    check (start_minute between 0 and 1410 and start_minute % 30 = 0),
  value numeric(2, 1) check (value in (0, 0.5, 1)),
  online_only boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (member_email, date, start_minute)
);

create index availability_manual_date_idx
  on public.availability_manual (date);

-- public.set_updated_at() comes from the events migration.
create trigger availability_manual_set_updated_at
  before update on public.availability_manual
  for each row
  execute function public.set_updated_at();

alter table public.availability_manual enable row level security;

-- No anonymous access. The app writes with an upsert (insert … on conflict
-- update), which updates every sent column, so update is granted on the whole
-- row; the policies below keep each member on their own rows.
revoke all on public.availability_manual from anon;
grant select, insert, update, delete on public.availability_manual to authenticated;

create policy "availability_manual_select_for_members"
  on public.availability_manual for select to authenticated
  using ((select public.is_member()));

create policy "availability_manual_insert_own"
  on public.availability_manual for insert to authenticated
  with check (
    (select public.is_member())
    and member_email = (select lower(auth.jwt() ->> 'email'))
  );

create policy "availability_manual_update_own"
  on public.availability_manual for update to authenticated
  using (
    (select public.is_member())
    and member_email = (select lower(auth.jwt() ->> 'email'))
  )
  with check (
    (select public.is_member())
    and member_email = (select lower(auth.jwt() ->> 'email'))
  );

create policy "availability_manual_delete_own"
  on public.availability_manual for delete to authenticated
  using (
    (select public.is_member())
    and member_email = (select lower(auth.jwt() ->> 'email'))
  );
