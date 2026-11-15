-- Members manage the panel allowlist from /panel/ajustes.
--
-- Members still only SELECT public.members directly (no insert/update/delete
-- policies). Every write goes through the security definer functions below,
-- which run as the owner with an empty search_path, check public.is_member()
-- themselves and validate their input. Errors are raised with stable codes
-- (the exception message) that the app maps to Spanish copy.
--
-- Effect of removing a member on rows that reference members(email):
--   tasks.assignee_email            on delete set null -> task kept, unassigned
--   suggestions.author_email        on delete set null -> kept, "Antiguo miembro"
--   suggestion_votes.member_email   on delete cascade  -> only their own votes
--   availability_template/override  on delete cascade  -> only their own rows
--   calendar_feeds / busy_blocks /
--   calendar_export_tokens          on delete cascade  -> only their own rows
-- created_by / uploaded_by columns (events, links, tasks, vault, forms…) are
-- plain text without a FK, so shared team data is never deleted or blocked.

-- Backward compatible: nullable column with a default; existing rows get null.
alter table public.members
  add column added_by text default lower(auth.jwt() ->> 'email');

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
  if not public.is_member() then
    raise exception 'not_member' using errcode = '42501';
  end if;
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
  if not public.is_member() then
    raise exception 'not_member' using errcode = '42501';
  end if;
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
  if not public.is_member() then
    raise exception 'not_member' using errcode = '42501';
  end if;
  if v_email = lower(auth.jwt() ->> 'email') then
    raise exception 'cannot_remove_self';
  end if;

  -- SHARE ROW EXCLUSIVE conflicts with itself, so concurrent removals run one
  -- after another and two members cannot remove each other down to zero.
  -- Reads (and is_member()) are not blocked.
  lock table public.members in share row exclusive mode;

  -- Re-check after waiting for the lock: the caller may have been removed.
  if not public.is_member() then
    raise exception 'not_member' using errcode = '42501';
  end if;
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
