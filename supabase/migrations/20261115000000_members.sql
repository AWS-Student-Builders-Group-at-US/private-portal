-- T1: Core Team members allowlist and access helper.
-- Rows are managed manually from the Supabase dashboard (no client writes).

create table public.members (
  email text primary key check (email = lower(email)),
  name text not null,
  area text,
  color text,
  created_at timestamptz not null default now()
);

alter table public.members enable row level security;

-- True when the signed-in user's email is in the allowlist.
-- security definer so it can read members regardless of RLS (avoids recursion).
create or replace function public.is_member()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.members m
    where m.email = lower(auth.jwt() ->> 'email')
  );
$$;

revoke execute on function public.is_member() from public, anon;
grant execute on function public.is_member() to authenticated;

-- Members can read the members list. No insert/update/delete policies.
create policy "members_select_for_members"
  on public.members
  for select
  to authenticated
  using ((select public.is_member()));
