-- T5: availability. Weekly template + date overrides per member.
-- Weekdays: 0 = Monday … 6 = Sunday. Times are Europe/Madrid wall-clock times.
-- Every member can read everyone's availability (team view); each member can
-- only write their own rows.

create table public.availability_template (
  id uuid primary key default gen_random_uuid(),
  member_email text not null references public.members (email)
    on update cascade on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),
  start_time time not null,
  end_time time not null,
  created_at timestamptz not null default now(),
  constraint availability_template_ends_after_starts check (end_time > start_time)
);

create index availability_template_member_idx
  on public.availability_template (member_email);

create table public.availability_override (
  id uuid primary key default gen_random_uuid(),
  member_email text not null references public.members (email)
    on update cascade on delete cascade,
  date date not null,
  start_time time not null,
  end_time time not null,
  kind text not null check (kind in ('free', 'busy')),
  created_at timestamptz not null default now(),
  constraint availability_override_ends_after_starts check (end_time > start_time)
);

create index availability_override_member_date_idx
  on public.availability_override (member_email, date);

alter table public.availability_template enable row level security;
alter table public.availability_override enable row level security;

-- Template policies.
create policy "availability_template_select_for_members"
  on public.availability_template for select to authenticated
  using ((select public.is_member()));

create policy "availability_template_insert_own"
  on public.availability_template for insert to authenticated
  with check (
    (select public.is_member())
    and member_email = (select lower(auth.jwt() ->> 'email'))
  );

create policy "availability_template_delete_own"
  on public.availability_template for delete to authenticated
  using (
    (select public.is_member())
    and member_email = (select lower(auth.jwt() ->> 'email'))
  );

-- Override policies.
create policy "availability_override_select_for_members"
  on public.availability_override for select to authenticated
  using ((select public.is_member()));

create policy "availability_override_insert_own"
  on public.availability_override for insert to authenticated
  with check (
    (select public.is_member())
    and member_email = (select lower(auth.jwt() ->> 'email'))
  );

create policy "availability_override_delete_own"
  on public.availability_override for delete to authenticated
  using (
    (select public.is_member())
    and member_email = (select lower(auth.jwt() ->> 'email'))
  );
