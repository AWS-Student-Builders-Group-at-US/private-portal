-- T6: shared links and team suggestions with one vote per member.
-- Members (public.is_member()) only; no anon access.

-- Links ----------------------------------------------------------------------

create table public.links (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 200),
  url text not null check (url ~* '^https?://' and char_length(url) <= 2000),
  category text check (char_length(category) <= 60),
  notes text check (char_length(notes) <= 2000),
  created_by text not null default lower(auth.jwt() ->> 'email'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger links_set_updated_at
  before update on public.links
  for each row
  execute function public.set_updated_at();

alter table public.links enable row level security;

create policy "links_select_for_members"
  on public.links for select to authenticated
  using ((select public.is_member()));

create policy "links_insert_for_members"
  on public.links for insert to authenticated
  with check ((select public.is_member()));

create policy "links_update_for_members"
  on public.links for update to authenticated
  using ((select public.is_member()))
  with check ((select public.is_member()));

create policy "links_delete_for_members"
  on public.links for delete to authenticated
  using ((select public.is_member()));

-- Suggestions ----------------------------------------------------------------
-- author_email is null for anonymous suggestions: nothing links them to the
-- member who wrote them. A member can only sign with their own email.

create table public.suggestions (
  id uuid primary key default gen_random_uuid(),
  body text not null check (char_length(body) between 1 and 2000),
  author_email text references public.members (email)
    on update cascade on delete set null,
  status text not null default 'nueva'
    check (status in ('nueva', 'aceptada', 'descartada')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index suggestions_status_idx on public.suggestions (status);

create trigger suggestions_set_updated_at
  before update on public.suggestions
  for each row
  execute function public.set_updated_at();

alter table public.suggestions enable row level security;

create policy "suggestions_select_for_members"
  on public.suggestions for select to authenticated
  using ((select public.is_member()));

create policy "suggestions_insert_for_members"
  on public.suggestions for insert to authenticated
  with check (
    (select public.is_member())
    and (author_email is null
      or author_email = (select lower(auth.jwt() ->> 'email')))
  );

-- Any member can change the status (nueva / aceptada / descartada).
create policy "suggestions_update_for_members"
  on public.suggestions for update to authenticated
  using ((select public.is_member()))
  with check ((select public.is_member()));

create policy "suggestions_delete_for_members"
  on public.suggestions for delete to authenticated
  using ((select public.is_member()));

-- Only the status may change after creation.
revoke update on public.suggestions from authenticated;
grant update (status) on public.suggestions to authenticated;

-- Votes ----------------------------------------------------------------------

create table public.suggestion_votes (
  suggestion_id uuid not null references public.suggestions (id) on delete cascade,
  member_email text not null default lower(auth.jwt() ->> 'email')
    references public.members (email) on update cascade on delete cascade,
  created_at timestamptz not null default now(),
  primary key (suggestion_id, member_email)
);

alter table public.suggestion_votes enable row level security;

create policy "suggestion_votes_select_for_members"
  on public.suggestion_votes for select to authenticated
  using ((select public.is_member()));

create policy "suggestion_votes_insert_own"
  on public.suggestion_votes for insert to authenticated
  with check (
    (select public.is_member())
    and member_email = (select lower(auth.jwt() ->> 'email'))
  );

create policy "suggestion_votes_delete_own"
  on public.suggestion_votes for delete to authenticated
  using (
    (select public.is_member())
    and member_email = (select lower(auth.jwt() ->> 'email'))
  );
