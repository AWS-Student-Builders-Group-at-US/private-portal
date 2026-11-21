-- Tasks: optional priority (high / medium / low) and an optional external
-- link (a Drive doc, a GitHub PR…), both shown in the tasks table.
--
-- Backward compatible: two nullable columns; existing tasks keep no priority
-- and no link.

alter table public.tasks
  add column priority text check (priority in ('high', 'medium', 'low')),
  add column link_url text check (
    char_length(link_url) <= 2000 and link_url ~* '^https?://'
  );

create index tasks_priority_idx on public.tasks (priority);
