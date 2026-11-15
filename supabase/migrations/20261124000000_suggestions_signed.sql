-- Suggestions are always signed by their author (no anonymous option).
--
-- Decision: author_email stays NULLABLE. The FK keeps `on delete set null`
-- so that removing a member from the panel (see 20261124010000_member_admin)
-- keeps the team's suggestion history instead of deleting it or blocking the
-- removal; the app shows those rows as "Antiguo miembro". A NOT NULL column
-- would force either `on delete cascade` (losing history) or `restrict`
-- (making member removal fail), and SQL cannot apply NOT NULL to new rows only.
-- Signing is enforced on insert instead: the column defaults to the caller's
-- email and the insert policy requires it to equal that email, which also
-- rejects NULL (NULL = x is not true).
--
-- Backward compatible with the live code: signed inserts keep working; only
-- the anonymous insert (author_email = null) that this release removes is
-- now rejected. Production has no rows, so nothing needs backfilling.

alter table public.suggestions
  alter column author_email set default lower(auth.jwt() ->> 'email');

drop policy "suggestions_insert_for_members" on public.suggestions;

create policy "suggestions_insert_for_members"
  on public.suggestions for insert to authenticated
  with check (
    (select public.is_member())
    and author_email = (select lower(auth.jwt() ->> 'email'))
  );
