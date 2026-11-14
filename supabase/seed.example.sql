-- Example seed for public.members (placeholder data only).
-- The real seed with the team's actual emails is run manually in the
-- Supabase SQL editor and must NEVER be committed. If you keep a local copy,
-- name it supabase/seed.sql (it is git-ignored).
-- Emails must be lowercase.

insert into public.members (email, name, area, color) values
  ('member1@example.com', 'Member One', 'Coordination', '#f97316'),
  ('member2@example.com', 'Member Two', 'Events', '#0ea5e9'),
  ('member3@example.com', 'Member Three', 'Communication', '#22c55e'),
  ('member4@example.com', 'Member Four', 'Technical', '#a855f7'),
  ('member5@example.com', 'Member Five', 'Partnerships', '#eab308');
