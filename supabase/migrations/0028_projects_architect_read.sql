-- ───────────────────────────────────────────────────────────────────────
-- 0028_projects_architect_read.sql
--
-- Phase 13 Week 3 — extend public.projects SELECT to accepted
-- architect members.
--
-- Until this migration, projects.RLS was owner-only (migration 0003):
--   create policy "owner can select projects" using (auth.uid() = owner_id);
--
-- The Week 2 architect dashboard listed memberships from
-- project_members (its own RLS). The Week 3 verification panel needs
-- to actually READ the project's state (facts/recommendations/etc.)
-- so the architect can decide what to verify. This adds a second
-- SELECT policy that permits any signed-in user who is an accepted
-- architect on the project. Owner SELECT is preserved by the original
-- policy; the two are OR'd by Postgres.
--
-- INSERT / UPDATE / DELETE policies remain owner-only — architects
-- can READ the state but cannot mutate it directly. Mutation goes
-- through verify-fact (service role + role checks) or chat-turn
-- (with the qualifier-write-gate).
--
-- Apply path: Supabase Dashboard → SQL Editor → New query → Run.
-- Idempotent: drop policy if exists pattern.
-- ───────────────────────────────────────────────────────────────────────

drop policy if exists "architect-member can select projects" on public.projects;
create policy "architect-member can select projects"
  on public.projects for select
  using (
    exists (
      select 1
      from public.project_members pm
      where pm.project_id = projects.id
        and pm.user_id    = auth.uid()
        and pm.accepted_at is not null
    )
  );

-- ───────────────────────────────────────────────────────────────────────
-- Verification (post-apply):
--   1. As an architect (profiles.role='designer') with an accepted
--      project_members row, this should return one row:
--        select id from public.projects where id = '<project-uuid>';
--   2. As a different signed-in user with no membership, the same
--      query must return zero rows.
-- ───────────────────────────────────────────────────────────────────────
