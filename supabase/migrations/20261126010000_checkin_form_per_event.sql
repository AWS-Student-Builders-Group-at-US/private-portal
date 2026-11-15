-- UX round 2 / T3: named check-in forms, selectable per event.
-- A named form ("template": General, Charla, Taller…) owns its own history of
-- immutable versions in `checkin_forms`. Exactly one template is the default,
-- used by events without a form. Each check-in uses the latest version of the
-- event's form; attendees keep pointing at the exact version they accepted.
--
-- Backward compatible with the code still live during the deploy: nothing is
-- dropped or renamed, `publish_checkin_form` / `activate_checkin_form` keep
-- working (new versions land in the default form), and `is_active` keeps
-- marking the default form's newest version for the old readers.
-- Lock order in every new function: templates, then checkin_forms.

-- Named forms -----------------------------------------------------------------

create table public.checkin_form_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 80),
  is_default boolean not null default false,
  archived_at timestamptz,
  created_by text not null default lower(auth.jwt() ->> 'email'),
  created_at timestamptz not null default now(),
  constraint checkin_form_templates_default_not_archived
    check (not (is_default and archived_at is not null))
);

-- At most one default form.
create unique index checkin_form_templates_one_default_idx
  on public.checkin_form_templates (is_default)
  where is_default;

alter table public.checkin_form_templates enable row level security;

-- Writes only through the security definer functions below.
revoke insert, update, delete on public.checkin_form_templates from anon, authenticated;

create policy "checkin_form_templates_select_for_members"
  on public.checkin_form_templates for select to authenticated
  using ((select public.is_member()));

-- Backfill: every existing version belongs to "General", the default form.
insert into public.checkin_form_templates (name, is_default, created_by)
values ('General', true, 'system');

-- Versions belong to a template ------------------------------------------------

-- Default for inserts that do not name a form (the legacy publish function).
create or replace function public.default_checkin_form_template_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select id from public.checkin_form_templates where is_default limit 1;
$$;

revoke execute on function public.default_checkin_form_template_id()
  from public, anon, authenticated;

-- A template with versions cannot be deleted (no delete grant either).
alter table public.checkin_forms
  add column form_id uuid references public.checkin_form_templates (id) on delete restrict;

update public.checkin_forms
set form_id = (select id from public.checkin_form_templates where is_default);

alter table public.checkin_forms
  alter column form_id set default public.default_checkin_form_template_id(),
  alter column form_id set not null;

create index checkin_forms_form_id_version_idx
  on public.checkin_forms (form_id, version desc);

-- Events pick a form (null = default form) --------------------------------------

alter table public.events
  add column checkin_form_id uuid
    references public.checkin_form_templates (id) on delete restrict;

create index events_checkin_form_id_idx on public.events (checkin_form_id);

-- Member functions --------------------------------------------------------------

create or replace function public.create_checkin_form_template(p_name text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if not public.is_member() then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if char_length(btrim(coalesce(p_name, ''))) not between 1 and 80 then
    raise exception 'invalid name' using errcode = '22023';
  end if;

  insert into public.checkin_form_templates (name)
  values (btrim(p_name))
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.rename_checkin_form_template(p_id uuid, p_name text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_member() then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if char_length(btrim(coalesce(p_name, ''))) not between 1 and 80 then
    raise exception 'invalid name' using errcode = '22023';
  end if;

  update public.checkin_form_templates set name = btrim(p_name) where id = p_id;
  if not found then
    raise exception 'form not found' using errcode = 'P0002';
  end if;
end;
$$;

-- Archived forms are hidden from new events but keep serving the events that
-- already use them. The default form cannot be archived.
create or replace function public.set_checkin_form_template_archived(
  p_id uuid,
  p_archived boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_member() then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  lock table public.checkin_form_templates in share row exclusive mode;

  if not exists (select 1 from public.checkin_form_templates where id = p_id) then
    raise exception 'form not found' using errcode = 'P0002';
  end if;
  if p_archived and exists (
    select 1 from public.checkin_form_templates where id = p_id and is_default
  ) then
    raise exception 'default form cannot be archived' using errcode = '22023';
  end if;

  update public.checkin_form_templates
  set archived_at = case when p_archived then coalesce(archived_at, now()) end
  where id = p_id;
end;
$$;

-- The new default must be active and have at least one version, so events
-- without a form always have something to show.
create or replace function public.set_default_checkin_form_template(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_latest uuid;
begin
  if not public.is_member() then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  lock table public.checkin_form_templates in share row exclusive mode;
  lock table public.checkin_forms in share row exclusive mode;

  if not exists (
    select 1 from public.checkin_form_templates where id = p_id and archived_at is null
  ) then
    raise exception 'form not found' using errcode = 'P0002';
  end if;

  select id into v_latest
  from public.checkin_forms
  where form_id = p_id
  order by version desc
  limit 1;
  if v_latest is null then
    raise exception 'form has no versions' using errcode = '22023';
  end if;

  update public.checkin_form_templates set is_default = false where is_default and id <> p_id;
  update public.checkin_form_templates set is_default = true where id = p_id;

  -- Legacy flag for the code live during the deploy.
  update public.checkin_forms set is_active = false where is_active and id <> v_latest;
  update public.checkin_forms set is_active = true where id = v_latest;
end;
$$;

-- Publish a new immutable version of one form. Version numbers stay global.
create or replace function public.publish_checkin_form_version(
  p_form_id uuid,
  p_title text,
  p_intro text,
  p_fields jsonb,
  p_privacy_notice text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_version integer;
  v_is_default boolean;
begin
  if not public.is_member() then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if jsonb_typeof(p_fields) is distinct from 'array'
     or jsonb_array_length(p_fields) not between 4 and 20 then
    raise exception 'invalid fields' using errcode = '22023';
  end if;

  lock table public.checkin_form_templates in share row exclusive mode;
  lock table public.checkin_forms in share row exclusive mode;

  select is_default into v_is_default
  from public.checkin_form_templates
  where id = p_form_id and archived_at is null;
  if v_is_default is null then
    raise exception 'form not found' using errcode = 'P0002';
  end if;

  select coalesce(max(version), 0) + 1 into v_version from public.checkin_forms;

  if v_is_default then
    update public.checkin_forms set is_active = false where is_active;
  end if;

  insert into public.checkin_forms
    (form_id, version, title, intro, fields, privacy_notice, is_active)
  values
    (p_form_id, v_version, p_title, nullif(p_intro, ''), p_fields, p_privacy_notice, v_is_default)
  returning id into v_id;

  return v_id;
end;
$$;

revoke execute on function public.create_checkin_form_template(text) from public, anon;
grant execute on function public.create_checkin_form_template(text) to authenticated;
revoke execute on function public.rename_checkin_form_template(uuid, text) from public, anon;
grant execute on function public.rename_checkin_form_template(uuid, text) to authenticated;
revoke execute on function public.set_checkin_form_template_archived(uuid, boolean)
  from public, anon;
grant execute on function public.set_checkin_form_template_archived(uuid, boolean)
  to authenticated;
revoke execute on function public.set_default_checkin_form_template(uuid) from public, anon;
grant execute on function public.set_default_checkin_form_template(uuid) to authenticated;
revoke execute on function public.publish_checkin_form_version(uuid, text, text, jsonb, text)
  from public, anon;
grant execute on function public.publish_checkin_form_version(uuid, text, text, jsonb, text)
  to authenticated;
