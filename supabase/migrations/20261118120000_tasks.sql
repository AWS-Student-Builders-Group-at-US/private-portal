-- T4: tasks board. Members (public.is_member()) have full access; no anon access.
-- Deleting a member or an event keeps the task and clears the link.

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 200),
  description text check (char_length(description) <= 5000),
  status text not null default 'todo' check (status in ('todo', 'doing', 'done')),
  assignee_email text references public.members (email)
    on update cascade on delete set null,
  due_date date,
  event_id uuid references public.events (id) on delete set null,
  created_by text not null default lower(auth.jwt() ->> 'email'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index tasks_status_idx on public.tasks (status);
create index tasks_assignee_email_idx on public.tasks (assignee_email);
create index tasks_event_id_idx on public.tasks (event_id);

-- public.set_updated_at() comes from the events migration.
create trigger tasks_set_updated_at
  before update on public.tasks
  for each row
  execute function public.set_updated_at();

alter table public.tasks enable row level security;

create policy "tasks_select_for_members"
  on public.tasks for select to authenticated
  using ((select public.is_member()));

create policy "tasks_insert_for_members"
  on public.tasks for insert to authenticated
  with check ((select public.is_member()));

create policy "tasks_update_for_members"
  on public.tasks for update to authenticated
  using ((select public.is_member()))
  with check ((select public.is_member()));

create policy "tasks_delete_for_members"
  on public.tasks for delete to authenticated
  using ((select public.is_member()));
