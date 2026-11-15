-- Zernio: posts planned in Zernio are synced into public.posts (server only)
-- and shown on the public news section once published.
--
-- * posts.source distinguishes panel posts from Zernio posts. Zernio rows are
--   written only by the server (secret key, no JWT): webhook, daily cron and
--   the member-only "Sincronizar ahora" action. Members cannot edit their
--   content or delete them; they can only toggle show_on_site.
-- * posts.show_on_site lets members hide any post from the website.
-- * zernio_webhook_events dedupes webhook deliveries (retried up to 7 times);
--   the daily cron deletes rows older than 30 days.
--
-- Backward compatible: new columns with defaults, a new table, and replaced
-- functions/policies whose old callers keep working.

alter table public.posts
  add column source text not null default 'panel'
    check (source in ('panel', 'zernio')),
  add column zernio_post_id text unique,
  add column platform_urls jsonb not null default '{}'::jsonb
    check (jsonb_typeof(platform_urls) = 'object'),
  add column show_on_site boolean not null default true,
  add constraint posts_zernio_id_matches_source
    check ((source = 'zernio') = (zernio_post_id is not null));

-- Same workflow as before for members (JWT). New rules:
-- * server writes (no JWT) on Zernio rows are trusted as given (any status,
--   created_by 'zernio', approval/publish dates from Zernio);
-- * members can never set source, zernio_post_id or platform_urls (also
--   enforced by column grants), and on Zernio rows they may only change
--   show_on_site;
-- * show_on_site may be toggled on any post, including approved/published.
create or replace function public.posts_enforce_workflow()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  actor text := lower(auth.jwt() ->> 'email');
begin
  if actor is null and new.source = 'zernio' then
    if tg_op = 'UPDATE' and old.source <> 'zernio' then
      raise exception 'Panel posts cannot become Zernio posts';
    end if;
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.status <> 'draft' then
      raise exception 'New posts must start as draft';
    end if;
    -- Inserts without a JWT (service role, SQL editor) keep the given author.
    new.created_by := coalesce(actor, new.created_by);
    new.source := 'panel';
    new.zernio_post_id := null;
    new.platform_urls := '{}'::jsonb;
    new.approved_by := null;
    new.approved_at := null;
    new.published_at := null;
    return new;
  end if;

  new.source := old.source;
  new.zernio_post_id := old.zernio_post_id;
  new.platform_urls := old.platform_urls;
  new.created_by := old.created_by;

  if old.source = 'zernio' then
    if (
      new.title, new.slug, new.body, new.image_path, new.targets, new.status,
      new.scheduled_at, new.event_id, new.publish_error
    ) is distinct from (
      old.title, old.slug, old.body, old.image_path, old.targets, old.status,
      old.scheduled_at, old.event_id, old.publish_error
    ) then
      raise exception 'Zernio posts are edited in Zernio';
    end if;
    new.approved_by := old.approved_by;
    new.approved_at := old.approved_at;
    new.published_at := old.published_at;
    return new;
  end if;

  if new.status is distinct from old.status then
    if not (
      (old.status = 'draft' and new.status = 'review')
      or (old.status = 'review' and new.status in ('approved', 'draft'))
      or (old.status = 'approved' and new.status in ('published', 'draft'))
    ) then
      raise exception 'Status change % -> % is not allowed', old.status, new.status;
    end if;

    if new.status = 'approved' then
      if actor is null or actor = old.created_by then
        raise exception 'A post must be approved by a member other than its author';
      end if;
      new.approved_by := actor;
      new.approved_at := now();
    elsif new.status = 'published' then
      new.approved_by := old.approved_by;
      new.approved_at := old.approved_at;
      new.published_at := now();
    else -- back to draft
      new.approved_by := null;
      new.approved_at := null;
      new.published_at := null;
    end if;
  else
    new.approved_by := old.approved_by;
    new.approved_at := old.approved_at;
    new.published_at := old.published_at;
    if old.status in ('approved', 'published') and (
      new.title, new.slug, new.body, new.image_path, new.targets, new.scheduled_at
    ) is distinct from (
      old.title, old.slug, old.body, old.image_path, old.targets, old.scheduled_at
    ) then
      raise exception 'Approved posts cannot be edited; withdraw the approval first';
    end if;
  end if;
  return new;
end;
$$;

-- Members may toggle show_on_site (on any post); source, zernio_post_id and
-- platform_urls stay server-only (member inserts get them reset by the
-- trigger; member updates have no column grant for them).
grant update (show_on_site) on public.posts to authenticated;

-- Zernio posts are hidden (show_on_site), not deleted: the sync would bring
-- them back anyway.
drop policy "posts_delete_for_members" on public.posts;
create policy "posts_delete_for_members"
  on public.posts for delete to authenticated
  using ((select public.is_member()) and source = 'panel');

-- Webhook event log (dedupe) ------------------------------------------------

create table public.zernio_webhook_events (
  id text primary key check (char_length(id) between 1 and 200),
  event text not null check (char_length(event) between 1 and 100),
  received_at timestamptz not null default now()
);

create index zernio_webhook_events_received_at_idx
  on public.zernio_webhook_events (received_at);

alter table public.zernio_webhook_events enable row level security;

create policy "zernio_webhook_events_select_for_members"
  on public.zernio_webhook_events for select to authenticated
  using ((select public.is_member()));

revoke insert, update, delete on public.zernio_webhook_events from anon, authenticated;
grant select on public.zernio_webhook_events to authenticated;

-- Public news ---------------------------------------------------------------
-- Panel posts: unchanged rule (approved/published, targets the web, date
-- passed). Zernio posts: published, date passed. Both need show_on_site.
-- The result type gains platform_urls, so the functions are recreated.

drop function public.public_news(integer);
drop function public.public_news_item(text);

create function public.public_news(p_limit integer default 20)
returns table (
  title text,
  slug text,
  body text,
  image_path text,
  published_on timestamptz,
  platform_urls jsonb
)
language sql
stable
security definer
set search_path = ''
as $$
  select n.title, n.slug, n.body, n.image_path, n.published_on, n.platform_urls
  from (
    select p.title, p.slug, p.body, p.image_path, p.platform_urls,
      case when p.source = 'zernio' then coalesce(p.published_at, p.scheduled_at)
        else p.scheduled_at end as published_on
    from public.posts p
    where p.show_on_site
      and (
        (p.source = 'panel' and p.status in ('approved', 'published') and 'web' = any (p.targets))
        or (p.source = 'zernio' and p.status = 'published')
      )
  ) n
  where n.published_on is not null
    and n.published_on <= now()
  order by n.published_on desc
  limit least(greatest(coalesce(p_limit, 20), 1), 100);
$$;

create function public.public_news_item(p_slug text)
returns table (
  title text,
  slug text,
  body text,
  image_path text,
  published_on timestamptz,
  platform_urls jsonb
)
language sql
stable
security definer
set search_path = ''
as $$
  select n.title, n.slug, n.body, n.image_path, n.published_on, n.platform_urls
  from (
    select p.title, p.slug, p.body, p.image_path, p.platform_urls,
      case when p.source = 'zernio' then coalesce(p.published_at, p.scheduled_at)
        else p.scheduled_at end as published_on
    from public.posts p
    where p.slug = p_slug
      and p.show_on_site
      and (
        (p.source = 'panel' and p.status in ('approved', 'published') and 'web' = any (p.targets))
        or (p.source = 'zernio' and p.status = 'published')
      )
  ) n
  where n.published_on is not null
    and n.published_on <= now();
$$;

revoke execute on function public.public_news(integer) from public;
revoke execute on function public.public_news_item(text) from public;
grant execute on function public.public_news(integer) to anon, authenticated;
grant execute on function public.public_news_item(text) to anon, authenticated;
