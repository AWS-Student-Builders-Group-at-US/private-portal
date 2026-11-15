-- Posts control: draft -> review -> approved (by another member) -> published.
-- Members only for now; the public news page adds its own anon read policy.
-- Images live in the new PUBLIC bucket `public-media` (separate from the
-- private `event-files`).

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 200),
  slug text not null unique
    check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 80),
  body text not null check (char_length(body) between 1 and 10000),
  image_path text check (image_path ~ '^posts/[A-Za-z0-9._-]+$'),
  targets text[] not null
    check (cardinality(targets) > 0
      and targets <@ array['web', 'linkedin', 'instagram']::text[]),
  status text not null default 'draft'
    check (status in ('draft', 'review', 'approved', 'published')),
  scheduled_at timestamptz,
  event_id uuid references public.events (id) on delete set null,
  created_by text not null default lower(auth.jwt() ->> 'email'),
  approved_by text,
  approved_at timestamptz,
  published_at timestamptz,
  getlate_post_id text,
  publish_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Declarative backstop for the trigger below: nobody approves their own post.
  constraint posts_approver_is_not_author
    check (approved_by is null or approved_by <> created_by)
);

create index posts_status_idx on public.posts (status);
create index posts_scheduled_at_idx on public.posts (scheduled_at);

create trigger posts_set_updated_at
  before update on public.posts
  for each row
  execute function public.set_updated_at();

-- Enforces the workflow whatever the client sends:
-- * the author is always the signed-in member (never a client-supplied email),
--   so nobody can pose as someone else and then approve "their" post;
-- * new posts start as drafts; approval fields are server-set;
-- * only the allowed status moves; approval by someone other than the author;
-- * approved/published posts cannot change their content.
create or replace function public.posts_enforce_workflow()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  actor text := lower(auth.jwt() ->> 'email');
begin
  if tg_op = 'INSERT' then
    if new.status <> 'draft' then
      raise exception 'New posts must start as draft';
    end if;
    -- Inserts without a JWT (service role, SQL editor) keep the given author.
    new.created_by := coalesce(actor, new.created_by);
    new.approved_by := null;
    new.approved_at := null;
    new.published_at := null;
    return new;
  end if;

  new.created_by := old.created_by;

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

create trigger posts_enforce_workflow
  before insert or update on public.posts
  for each row
  execute function public.posts_enforce_workflow();

alter table public.posts enable row level security;

create policy "posts_select_for_members"
  on public.posts for select to authenticated
  using ((select public.is_member()));

create policy "posts_insert_for_members"
  on public.posts for insert to authenticated
  with check (
    (select public.is_member())
    and created_by = (select lower(auth.jwt() ->> 'email'))
  );

create policy "posts_update_for_members"
  on public.posts for update to authenticated
  using ((select public.is_member()))
  with check ((select public.is_member()));

create policy "posts_delete_for_members"
  on public.posts for delete to authenticated
  using ((select public.is_member()));

-- Members may only update the editable columns; the author and the approval
-- fields stay server-controlled (the trigger also pins them).
revoke update on public.posts from anon, authenticated;
grant update (title, slug, body, image_path, targets, status, scheduled_at, event_id)
  on public.posts to authenticated;

-- Storage: public bucket for post images, 5 MB, images only ------------------
-- Object path convention: `posts/<uuid>-<sanitized file name>` (unique per
-- upload, never upserted). Reading is public through the bucket's public URL.
-- Members can upload; objects are immutable (no update policy), and only the
-- uploader can delete their own image, and only while no approved or published
-- post shows it.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'public-media',
  'public-media',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict do nothing;

-- True when an approved or published post uses the image. Security definer so
-- the storage policy does not depend on the caller's view of `posts`.
create or replace function public.post_image_is_locked(p_path text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.posts p
    where p.image_path = p_path
      and p.status in ('approved', 'published')
  );
$$;

revoke execute on function public.post_image_is_locked(text) from public, anon;
grant execute on function public.post_image_is_locked(text) to authenticated;

create policy "public_media_objects_insert_for_members"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'public-media'
    and (storage.foldername(name))[1] = 'posts'
    and (select public.is_member())
  );

-- Storage `remove()` also needs select on the row; scope it to own uploads
-- (anyone can already fetch the files through the public URL).
create policy "public_media_objects_select_own"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'public-media'
    and owner_id = (select auth.uid()::text)
  );

create policy "public_media_objects_delete_own_unlocked"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'public-media'
    and owner_id = (select auth.uid()::text)
    and (select public.is_member())
    and not public.post_image_is_locked(name)
  );
