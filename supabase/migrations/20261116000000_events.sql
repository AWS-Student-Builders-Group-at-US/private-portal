-- T2: events, event files and the private `event-files` Storage bucket.
-- Members (public.is_member()) have full access. No anon access yet: the
-- public landing page will add its own read policy for `is_public` events.

-- Events ---------------------------------------------------------------------

create table public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  starts_at timestamptz not null,
  ends_at timestamptz,
  location text,
  meetup_url text,
  expected_attendees integer check (expected_attendees >= 0),
  is_public boolean not null default false,
  created_by text not null default lower(auth.jwt() ->> 'email'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint events_ends_after_starts check (ends_at is null or ends_at >= starts_at)
);

create index events_starts_at_idx on public.events (starts_at);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger events_set_updated_at
  before update on public.events
  for each row
  execute function public.set_updated_at();

alter table public.events enable row level security;

create policy "events_select_for_members"
  on public.events for select to authenticated
  using ((select public.is_member()));

create policy "events_insert_for_members"
  on public.events for insert to authenticated
  with check ((select public.is_member()));

create policy "events_update_for_members"
  on public.events for update to authenticated
  using ((select public.is_member()))
  with check ((select public.is_member()));

create policy "events_delete_for_members"
  on public.events for delete to authenticated
  using ((select public.is_member()));

-- Event files (metadata for objects in the `event-files` bucket) ------------

-- Deleting an event cascades to these rows but does NOT delete the Storage
-- objects; the app removes the objects first, then deletes the event.
create table public.event_files (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  storage_path text not null unique,
  file_name text not null,
  size_bytes bigint,
  content_type text,
  uploaded_by text not null default lower(auth.jwt() ->> 'email'),
  created_at timestamptz not null default now()
);

create index event_files_event_id_idx on public.event_files (event_id);

alter table public.event_files enable row level security;

create policy "event_files_select_for_members"
  on public.event_files for select to authenticated
  using ((select public.is_member()));

create policy "event_files_insert_for_members"
  on public.event_files for insert to authenticated
  with check ((select public.is_member()));

create policy "event_files_delete_for_members"
  on public.event_files for delete to authenticated
  using ((select public.is_member()));

-- Storage: private bucket, 50 MB per file ------------------------------------
-- Object path convention: `<event_id>/<uuid>-<sanitized file name>`.
-- Downloads use short-lived signed URLs (60 s) created by members.

insert into storage.buckets (id, name, public, file_size_limit)
values ('event-files', 'event-files', false, 52428800)
on conflict do nothing;

create policy "event_files_objects_select_for_members"
  on storage.objects for select to authenticated
  using (bucket_id = 'event-files' and (select public.is_member()));

create policy "event_files_objects_insert_for_members"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'event-files' and (select public.is_member()));

create policy "event_files_objects_delete_for_members"
  on storage.objects for delete to authenticated
  using (bucket_id = 'event-files' and (select public.is_member()));
