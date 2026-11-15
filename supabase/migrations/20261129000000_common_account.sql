-- The group's common account (#32): the only account that manages members.
--
-- The common account is the group's Gmail address (server env GMAIL_USER).
-- The address is never committed (public repository): the server writes it
-- with the admin (secret) key into public.private_settings, a table members
-- cannot read or write (RLS on, no policies, no grants to anon/authenticated).
--
-- public.is_common_account() tells the caller whether they ARE the common
-- account, without revealing the address. add_member, update_member and
-- remove_member keep their signatures and checks and, once the common
-- account is configured, only accept calls from it (error code
-- 'not_common_account'); while it is not configured any member can still
-- manage members, so nobody is locked out. The common account can never be
-- removed ('cannot_remove_common_account').
--
-- Backward compatible: a new table and functions; the three RPCs are
-- replaced with the same signatures and behave as before until the setting
-- is written.

create table public.private_settings (
  key text primary key check (key in ('common_account_email')),
  value text not null check (value = lower(trim(value)) and value <> ''),
  updated_at timestamptz not null default now()
);

alter table public.private_settings enable row level security;
-- No policies: only the secret key (which bypasses RLS) and security definer
-- functions owned by the migration role can touch it.
revoke all on public.private_settings from public, anon, authenticated;
grant select, insert, update, delete on public.private_settings to service_role;

-- Internal: the configured address or null. Not callable by members.
create or replace function public.common_account_email()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select s.value from public.private_settings s where s.key = 'common_account_email';
$$;

revoke execute on function public.common_account_email() from public, anon, authenticated;
grant execute on function public.common_account_email() to service_role;

-- True when the signed-in user is the common account.
create or replace function public.is_common_account()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    lower(auth.jwt() ->> 'email') = public.common_account_email(),
    false
  );
$$;

revoke execute on function public.is_common_account() from public, anon;
grant execute on function public.is_common_account() to authenticated;

-- Shared guard: members only and, once configured, the common account only.
create or replace function public.assert_member_manager()
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_member() then
    raise exception 'not_member' using errcode = '42501';
  end if;
  if public.common_account_email() is not null and not public.is_common_account() then
    raise exception 'not_common_account' using errcode = '42501';
  end if;
end;
$$;

revoke execute on function public.assert_member_manager() from public, anon, authenticated;

-- Add -----------------------------------------------------------------------

create or replace function public.add_member(p_email text, p_name text, p_area text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text := lower(trim(p_email));
  v_name text := trim(p_name);
begin
  perform public.assert_member_manager();
  if v_email is null or v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    raise exception 'invalid_email';
  end if;
  if v_name is null or char_length(v_name) not between 1 and 80 then
    raise exception 'invalid_name';
  end if;
  if p_area is null
    or p_area not in ('organizacion', 'tecnico', 'comunicacion', 'logistica', 'otra') then
    raise exception 'invalid_area';
  end if;

  insert into public.members (email, name, area, added_by)
  values (v_email, v_name, p_area, lower(auth.jwt() ->> 'email'))
  on conflict (email) do nothing;

  if not found then
    raise exception 'member_exists';
  end if;
end;
$$;

-- Update (name and area only; the email is the identity) --------------------

create or replace function public.update_member(p_email text, p_name text, p_area text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text := trim(p_name);
begin
  perform public.assert_member_manager();
  if v_name is null or char_length(v_name) not between 1 and 80 then
    raise exception 'invalid_name';
  end if;
  if p_area is null
    or p_area not in ('organizacion', 'tecnico', 'comunicacion', 'logistica', 'otra') then
    raise exception 'invalid_area';
  end if;

  update public.members
  set name = v_name, area = p_area
  where email = lower(trim(p_email));

  if not found then
    raise exception 'member_not_found';
  end if;
end;
$$;

-- Remove --------------------------------------------------------------------

create or replace function public.remove_member(p_email text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text := lower(trim(p_email));
begin
  perform public.assert_member_manager();
  if v_email = lower(auth.jwt() ->> 'email') then
    raise exception 'cannot_remove_self';
  end if;
  if v_email = public.common_account_email() then
    raise exception 'cannot_remove_common_account';
  end if;

  -- SHARE ROW EXCLUSIVE conflicts with itself, so concurrent removals run one
  -- after another and two members cannot remove each other down to zero.
  -- Reads (and is_member()) are not blocked.
  lock table public.members in share row exclusive mode;

  -- Re-check after waiting for the lock: the caller may have been removed.
  perform public.assert_member_manager();
  if not exists (select 1 from public.members where email = v_email) then
    raise exception 'member_not_found';
  end if;
  if (select count(*) from public.members) <= 1 then
    raise exception 'last_member';
  end if;

  delete from public.members where email = v_email;
end;
$$;

revoke execute on function public.add_member(text, text, text) from public, anon;
revoke execute on function public.update_member(text, text, text) from public, anon;
revoke execute on function public.remove_member(text) from public, anon;
grant execute on function public.add_member(text, text, text) to authenticated;
grant execute on function public.update_member(text, text, text) to authenticated;
grant execute on function public.remove_member(text) to authenticated;
