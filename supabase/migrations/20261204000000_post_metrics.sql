-- Post insights from Zernio (GET /v1/analytics): one row per Zernio post with
-- its latest totals and a per-platform breakdown.
--
-- * Written only by the server (secret key): the daily cron, the member-only
--   "Sincronizar ahora" action and the `analytics.synced` webhook.
-- * Members read them on /panel/publicaciones; nothing is public.
--
-- Backward compatible: a new table only.

create table public.post_metrics (
  post_id uuid primary key references public.posts (id) on delete cascade,
  impressions integer not null default 0 check (impressions >= 0),
  reach integer not null default 0 check (reach >= 0),
  likes integer not null default 0 check (likes >= 0),
  comments integer not null default 0 check (comments >= 0),
  shares integer not null default 0 check (shares >= 0),
  saves integer not null default 0 check (saves >= 0),
  clicks integer not null default 0 check (clicks >= 0),
  views integer not null default 0 check (views >= 0),
  engagement_rate numeric(8, 2) check (engagement_rate >= 0),
  platforms jsonb not null default '[]'::jsonb check (jsonb_typeof(platforms) = 'array'),
  sync_status text not null default 'pending'
    check (sync_status in ('synced', 'pending', 'partial', 'unavailable')),
  metrics_updated_at timestamptz,
  fetched_at timestamptz not null default now()
);

alter table public.post_metrics enable row level security;

create policy "post_metrics_select_for_members"
  on public.post_metrics for select to authenticated
  using ((select public.is_member()));

revoke insert, update, delete on public.post_metrics from anon, authenticated;
grant select on public.post_metrics to authenticated;
