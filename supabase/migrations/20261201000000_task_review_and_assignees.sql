-- Tasks: a "review" status ("Pendiente de revisión", between "doing" and
-- "done") and several assignees per task.
--
-- Assignees live in public.task_assignees (one row per task and member). The
-- app keeps tasks.assignee_email filled with the first assignee so code that
-- still reads that column during a deploy keeps working; a later release can
-- drop it. Removing a member deletes only their assignee rows (task kept).
--
-- Backward compatible: the status check only gains a value, the new table is
-- additive and is backfilled from tasks.assignee_email.

alter table public.tasks drop constraint tasks_status_check;
alter table public.tasks
  add constraint tasks_status_check
  check (status in ('todo', 'doing', 'review', 'done'));

create table public.task_assignees (
  task_id uuid not null references public.tasks (id) on delete cascade,
  member_email text not null references public.members (email)
    on update cascade on delete cascade,
  created_at timestamptz not null default now(),
  primary key (task_id, member_email)
);

create index task_assignees_member_email_idx
  on public.task_assignees (member_email);

insert into public.task_assignees (task_id, member_email)
select id, assignee_email
from public.tasks
where assignee_email is not null;

alter table public.task_assignees enable row level security;

-- Same access as tasks: members only, no anonymous access.
revoke all on public.task_assignees from anon;
grant select, insert, delete on public.task_assignees to authenticated;

create policy "task_assignees_select_for_members"
  on public.task_assignees for select to authenticated
  using ((select public.is_member()));

create policy "task_assignees_insert_for_members"
  on public.task_assignees for insert to authenticated
  with check ((select public.is_member()));

create policy "task_assignees_delete_for_members"
  on public.task_assignees for delete to authenticated
  using ((select public.is_member()));

-- Replaces a task's assignees in one transaction. Security invoker: runs with
-- the caller's rights, so the RLS policies above still apply.
create or replace function public.set_task_assignees(p_task_id uuid, p_emails text[])
returns void
language sql
security invoker
set search_path = ''
as $$
  delete from public.task_assignees
  where task_id = p_task_id
    and member_email <> all (coalesce(p_emails, '{}'));
  insert into public.task_assignees (task_id, member_email)
  select p_task_id, email
  from unnest(coalesce(p_emails, '{}')) as email
  on conflict do nothing;
$$;

revoke all on function public.set_task_assignees(uuid, text[]) from public, anon;
grant execute on function public.set_task_assignees(uuid, text[]) to authenticated;
