-- Public website: read-only functions for anon visitors.
-- No anon policies on the tables: these security definer functions return only
-- public columns (no emails, QR tokens, internal descriptions or approvers).

-- News = approved/published posts targeting the web whose date has passed.
create or replace function public.public_news(p_limit integer default 20)
returns table (
  title text,
  slug text,
  body text,
  image_path text,
  published_on timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select p.title, p.slug, p.body, p.image_path, p.scheduled_at
  from public.posts p
  where p.status in ('approved', 'published')
    and 'web' = any (p.targets)
    and p.scheduled_at is not null
    and p.scheduled_at <= now()
  order by p.scheduled_at desc
  limit least(greatest(coalesce(p_limit, 20), 1), 100);
$$;

create or replace function public.public_news_item(p_slug text)
returns table (
  title text,
  slug text,
  body text,
  image_path text,
  published_on timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select p.title, p.slug, p.body, p.image_path, p.scheduled_at
  from public.posts p
  where p.slug = p_slug
    and p.status in ('approved', 'published')
    and 'web' = any (p.targets)
    and p.scheduled_at is not null
    and p.scheduled_at <= now();
$$;

-- Upcoming public events: title, dates, place and Meetup link only.
create or replace function public.public_upcoming_events(p_limit integer default 6)
returns table (
  title text,
  starts_at timestamptz,
  ends_at timestamptz,
  location text,
  meetup_url text
)
language sql
stable
security definer
set search_path = ''
as $$
  select e.title, e.starts_at, e.ends_at, e.location, e.meetup_url
  from public.events e
  where e.is_public
    and coalesce(e.ends_at, e.starts_at) >= now()
  order by e.starts_at
  limit least(greatest(coalesce(p_limit, 6), 1), 50);
$$;

revoke execute on function public.public_news(integer) from public;
revoke execute on function public.public_news_item(text) from public;
revoke execute on function public.public_upcoming_events(integer) from public;
grant execute on function public.public_news(integer) to anon, authenticated;
grant execute on function public.public_news_item(text) to anon, authenticated;
grant execute on function public.public_upcoming_events(integer) to anon, authenticated;
