-- Calendar importance weights. Each Google feed has a weight: 1 = "can't
-- move it", 0.5 = "could move it". Busy blocks copy the weight of their feed
-- so other members can read it without access to the feed rows.

alter table public.calendar_feeds
  add column weight numeric(2, 1) not null default 1
    constraint calendar_feeds_weight_check check (weight in (0.5, 1));

alter table public.calendar_busy_blocks
  add column weight numeric(2, 1) not null default 1
    constraint calendar_busy_blocks_weight_check check (weight in (0.5, 1));

-- Owners may change only `weight` and `label` of their own feeds. The table
-- level update grant stays revoked (fetch status, URL and owner are written
-- by the server), so this column grant is the only update path for members.
grant update (weight, label) on public.calendar_feeds to authenticated;

create policy "calendar_feeds_update_own"
  on public.calendar_feeds for update to authenticated
  using (
    member_email = lower(auth.jwt() ->> 'email') and (select public.is_member())
  )
  with check (
    member_email = lower(auth.jwt() ->> 'email') and (select public.is_member())
  );

-- Keeps the stored blocks of a feed in sync with its weight. A trigger (rather
-- than a separate RPC) covers every update path: the owner's RLS-checked
-- update and any server-side write. It only fires for rows the caller was
-- allowed to update, so ownership and membership are enforced by the policy
-- above. Security definer because members have no write grant on
-- calendar_busy_blocks.
create or replace function public.sync_calendar_busy_blocks_weight()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.calendar_busy_blocks b
  set weight = new.weight
  where b.feed_id = new.id
    and b.weight is distinct from new.weight;
  return null;
end;
$$;

-- Only callable as a trigger (EXECUTE is checked when the trigger is created,
-- not when it fires).
revoke execute on function public.sync_calendar_busy_blocks_weight()
  from public, anon, authenticated;

create trigger calendar_feeds_sync_weight
  after update of weight on public.calendar_feeds
  for each row
  when (old.weight is distinct from new.weight)
  execute function public.sync_calendar_busy_blocks_weight();
