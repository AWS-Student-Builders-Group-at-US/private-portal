-- Team-wide app settings editable from /panel/ajustes.
--
-- Members only SELECT public.app_settings directly; every write goes through
-- public.set_app_setting(), a security definer function that checks
-- public.is_member(), only accepts whitelisted keys and validates the value.
-- Errors are raised with stable codes (the exception message) that the app
-- maps to Spanish copy.
--
-- Keys:
--   drive_folder_id  Google Drive folder shown in /panel/recursos (falls back
--                    to env GOOGLE_DRIVE_FOLDER_ID when unset).
--
-- Backward compatible: a new table and function only.

create table public.app_settings (
  key text primary key,
  value text not null,
  updated_by text not null default lower(auth.jwt() ->> 'email'),
  updated_at timestamptz not null default now()
);

alter table public.app_settings enable row level security;

create policy "app_settings_select_for_members"
  on public.app_settings for select to authenticated
  using ((select public.is_member()));

revoke insert, update, delete on public.app_settings from anon, authenticated;
grant select on public.app_settings to authenticated;

create or replace function public.set_app_setting(p_key text, p_value text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_value text := trim(p_value);
begin
  if not public.is_member() then
    raise exception 'not_member' using errcode = '42501';
  end if;

  if p_key = 'drive_folder_id' then
    if v_value is null or v_value !~ '^[A-Za-z0-9_-]{10,100}$' then
      raise exception 'invalid_value';
    end if;
  else
    raise exception 'invalid_key';
  end if;

  insert into public.app_settings (key, value, updated_by, updated_at)
  values (p_key, v_value, lower(auth.jwt() ->> 'email'), now())
  on conflict (key) do update
    set value = excluded.value,
        updated_by = excluded.updated_by,
        updated_at = excluded.updated_at;
end;
$$;

revoke execute on function public.set_app_setting(text, text) from public, anon;
grant execute on function public.set_app_setting(text, text) to authenticated;
