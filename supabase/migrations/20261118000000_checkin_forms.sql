-- T3b: editable, versioned check-in form and privacy notice.
-- Every publish inserts a new immutable version; exactly one is active.
-- Members read versions and publish/activate them only through the two
-- security definer functions below. The public check-in page and /privacidad
-- read the active version server-side with the secret key.

create table public.checkin_forms (
  id uuid primary key default gen_random_uuid(),
  version integer not null unique check (version > 0),
  title text not null check (char_length(title) between 1 and 120),
  intro text check (char_length(intro) <= 1000),
  fields jsonb not null check (jsonb_typeof(fields) = 'array'),
  privacy_notice text not null check (char_length(privacy_notice) between 1 and 20000),
  is_active boolean not null default false,
  created_by text not null default lower(auth.jwt() ->> 'email'),
  created_at timestamptz not null default now()
);

-- At most one active version.
create unique index checkin_forms_one_active_idx
  on public.checkin_forms (is_active)
  where is_active;

alter table public.checkin_forms enable row level security;

-- Versions are immutable: no direct writes for anyone.
revoke insert, update, delete on public.checkin_forms from anon, authenticated;

create policy "checkin_forms_select_for_members"
  on public.checkin_forms for select to authenticated
  using ((select public.is_member()));

-- Publish a new version and make it the active one (single transaction).
-- The app validates the definition first (zod); these checks are a backstop.
create or replace function public.publish_checkin_form(
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
begin
  if not public.is_member() then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if jsonb_typeof(p_fields) is distinct from 'array'
     or jsonb_array_length(p_fields) not between 4 and 20 then
    raise exception 'invalid fields' using errcode = '22023';
  end if;

  -- Serialise concurrent publishes so version numbers stay sequential.
  lock table public.checkin_forms in share row exclusive mode;

  select coalesce(max(version), 0) + 1 into v_version from public.checkin_forms;

  update public.checkin_forms set is_active = false where is_active;

  insert into public.checkin_forms (version, title, intro, fields, privacy_notice, is_active)
  values (v_version, p_title, nullif(p_intro, ''), p_fields, p_privacy_notice, true)
  returning id into v_id;

  return v_id;
end;
$$;

-- Make an older version the active one again.
create or replace function public.activate_checkin_form(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_member() then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  lock table public.checkin_forms in share row exclusive mode;

  if not exists (select 1 from public.checkin_forms where id = p_id) then
    raise exception 'form version not found' using errcode = 'P0002';
  end if;

  update public.checkin_forms set is_active = false where is_active and id <> p_id;
  update public.checkin_forms set is_active = true where id = p_id;
end;
$$;

revoke execute on function public.publish_checkin_form(text, text, jsonb, text) from public, anon;
grant execute on function public.publish_checkin_form(text, text, jsonb, text) to authenticated;
revoke execute on function public.activate_checkin_form(uuid) from public, anon;
grant execute on function public.activate_checkin_form(uuid) to authenticated;

-- Version 1: the form and privacy notice used until now.
-- TODO(before the first real event): review the notice and complete the
-- controller and contact placeholders with the faculty (publish a new version).
insert into public.checkin_forms (version, title, intro, fields, privacy_notice, is_active, created_by)
values (
  1,
  'Registro de asistencia',
  null,
  '[
    {"key": "name", "type": "text", "label": "Nombre", "required": true},
    {"key": "email", "type": "email", "label": "Correo electrónico", "required": true},
    {"key": "photo_consent", "type": "checkbox", "label": "Acepto aparecer en fotos y vídeos del evento", "required": false},
    {"key": "email_consent", "type": "checkbox", "label": "Quiero recibir correos sobre próximos eventos", "required": false}
  ]'::jsonb,
  $notice$## Responsable del tratamiento

[Responsable pendiente de confirmar con la facultad]

## Qué datos recogemos

Al registrar tu asistencia a un evento recogemos tu nombre, tu correo electrónico, la fecha y hora del registro y tus respuestas a las dos casillas de consentimiento (fotos y vídeos; correos sobre próximos eventos).

## Para qué los usamos

- Controlar la asistencia a nuestros eventos.
- Publicar fotos y vídeos en los que aparezcas, solo si has marcado esa casilla.
- Enviarte correos sobre próximos eventos, solo si has marcado esa casilla.

## Base legal

Tu consentimiento, que puedes retirar en cualquier momento sin que afecte a los tratamientos anteriores.

## Cuánto tiempo los guardamos

Los datos de asistencia se eliminan al terminar cada curso académico.

## Quién accede

Solo los miembros del Core Team del grupo. No cedemos tus datos a terceros.

## Tus derechos

Puedes acceder a tus datos, rectificarlos, suprimirlos, oponerte a su tratamiento, solicitar su limitación o portabilidad y retirar tu consentimiento escribiendo a [correo de contacto pendiente]. También puedes reclamar ante la Agencia Española de Protección de Datos (www.aepd.es).$notice$,
  true,
  'system'
);

-- Attendees: link each row to the exact version accepted, plus extra answers.
-- `consent_version` now holds that version number as text.
alter table public.attendees
  add column form_version_id uuid references public.checkin_forms (id),
  add column answers jsonb not null default '{}'::jsonb;

create index attendees_form_version_id_idx on public.attendees (form_version_id);
