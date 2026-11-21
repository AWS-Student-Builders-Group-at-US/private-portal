-- Outgoing email reminders (T6). Only reminders the portal SENDS are stored;
-- inbound emails are still never stored.
--
-- 1. tasks.email_reminder: "Recordarme por correo". When true and the task
--    has a due_date, the daily cron emails each assignee the day before
--    (Europe/Madrid), unless the task is done.
-- 2. public.task_reminder_sends: one row per (task, assignee, due date)
--    already emailed, so a reminder is never sent twice. Changing the due
--    date allows one new reminder for the new date. Server-only: written and
--    read by the daily cron with the admin client; members have no access.
-- 3. public.reminders: free-form reminders a member writes for themself
--    (text, date, optional note). The cron emails them to their owner on
--    that date and sets sent_at. Owner-only access.
--
-- Backward compatible: a column with a default and new tables only.

alter table public.tasks
  add column email_reminder boolean not null default false;

create table public.task_reminder_sends (
  task_id uuid not null references public.tasks (id) on delete cascade,
  member_email text not null
    references public.members (email) on update cascade on delete cascade,
  due_date date not null,
  sent_at timestamptz not null default now(),
  primary key (task_id, member_email, due_date)
);

create index task_reminder_sends_member_email_idx
  on public.task_reminder_sends (member_email);

alter table public.task_reminder_sends enable row level security;
-- No policies: only the secret-key client (daily cron) reads or writes it.
revoke all on public.task_reminder_sends from anon, authenticated;

create table public.reminders (
  id uuid primary key default gen_random_uuid(),
  member_email text not null default lower(auth.jwt() ->> 'email')
    references public.members (email) on update cascade on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  note text check (note is null or char_length(note) <= 2000),
  remind_on date not null,
  -- Set by the daily cron once the email went out; null while pending.
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index reminders_member_remind_on_idx
  on public.reminders (member_email, remind_on);
create index reminders_pending_idx
  on public.reminders (remind_on) where sent_at is null;

-- public.set_updated_at() comes from the events migration.
create trigger reminders_set_updated_at
  before update on public.reminders
  for each row
  execute function public.set_updated_at();

-- Moving a reminder to another date makes it pending again.
create or replace function public.reminders_reset_sent_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.remind_on is distinct from old.remind_on then
    new.sent_at := null;
  end if;
  return new;
end;
$$;

create trigger reminders_reset_sent_at
  before update on public.reminders
  for each row
  execute function public.reminders_reset_sent_at();

alter table public.reminders enable row level security;

-- Members manage the content of their own reminders; owner, sent_at and
-- timestamps are not updatable by them.
revoke all on public.reminders from anon;
revoke update on public.reminders from authenticated;
grant select, insert, delete on public.reminders to authenticated;
grant update (title, note, remind_on) on public.reminders to authenticated;

create policy "reminders_select_own"
  on public.reminders for select to authenticated
  using (
    (select public.is_member())
    and member_email = (select lower(auth.jwt() ->> 'email'))
  );

create policy "reminders_insert_own"
  on public.reminders for insert to authenticated
  with check (
    (select public.is_member())
    and member_email = (select lower(auth.jwt() ->> 'email'))
    and sent_at is null
  );

create policy "reminders_update_own"
  on public.reminders for update to authenticated
  using (
    (select public.is_member())
    and member_email = (select lower(auth.jwt() ->> 'email'))
  )
  with check (
    (select public.is_member())
    and member_email = (select lower(auth.jwt() ->> 'email'))
  );

create policy "reminders_delete_own"
  on public.reminders for delete to authenticated
  using (
    (select public.is_member())
    and member_email = (select lower(auth.jwt() ->> 'email'))
  );
