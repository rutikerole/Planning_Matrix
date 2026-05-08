-- ───────────────────────────────────────────────────────────────────────
-- 0031_fix_projects_rls_recursion.sql
--
-- v1.0.2 hot-fix — break the projects ↔ project_members RLS cycle that
-- fires Postgres `42P17` ("infinite recursion detected in policy for
-- relation X") on EVERY query against either table once 0028 is
-- applied alongside 0026.
--
-- Cycle source:
--   • projects."architect-member can select projects" (0028) USING-
--     subqueries `public.project_members`.
--   • project_members."members read own membership" (0026) USING-
--     subqueries `public.projects` (owner sub-clause).
--   When Postgres evaluates either RLS, it triggers the other's RLS,
--   which triggers the first's again, and so on. Postgres detects
--   the cycle and aborts. Result in production: dashboard SELECT
--   500s ("No projects yet" empty state); wizard INSERT 500s
--   ("Project couldn't be created").
--
-- Fix: replace the cross-table EXISTS subqueries with SECURITY DEFINER
-- helper functions. The helpers run as their owner (`postgres`), which
-- has BYPASSRLS — the inner SELECT does not re-fire RLS, so the cycle
-- is broken at the function boundary. `auth.uid()` is read from the
-- calling session GUC, so caller identity is preserved.
--
-- Hardening pattern (Supabase 2026 recommendation, matches
-- migrations/0001_profiles.sql:52-56):
--   • language sql              — pure SQL body, no PL/pgSQL needed.
--   • security definer          — bypass RLS in the body.
--   • set search_path = ''      — protects against search-path hijack;
--     all identifiers must be schema-qualified inside the body.
--   • stable                    — same result for same args in one
--     statement; enables query plan optimization.
--   • revoke all from public + grant execute to authenticated, anon
--     — explicit grant; service_role bypasses RLS, doesn't need
--     EXECUTE.
--
-- Apply path: Supabase Dashboard → SQL Editor → New query → Run.
-- Idempotent: CREATE OR REPLACE FUNCTION + DROP POLICY IF EXISTS.
--
-- Regression guard: smokeWalk's `v1.0.2 CRIT: rls-recursion-fix` drift
-- fixture pins the helper-function shape, the grant posture, and the
-- new USING clauses against this exact file.
-- ───────────────────────────────────────────────────────────────────────

-- ── Helper 1 — owner of a given project (caller identity) ─────────────
create or replace function public.is_project_owner(p_project_id uuid)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1
    from public.projects p
    where p.id       = p_project_id
      and p.owner_id = auth.uid()
  );
$$;

-- ── Helper 2 — accepted architect on a given project (caller) ─────────
create or replace function public.is_accepted_architect(p_project_id uuid)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1
    from public.project_members pm
    where pm.project_id  = p_project_id
      and pm.user_id     = auth.uid()
      and pm.accepted_at is not null
  );
$$;

-- ── Grants — drop default PUBLIC grant; add explicit per-role grants ──
revoke all on function public.is_project_owner(uuid)      from public;
revoke all on function public.is_accepted_architect(uuid) from public;
grant  execute on function public.is_project_owner(uuid)      to authenticated, anon;
grant  execute on function public.is_accepted_architect(uuid) to authenticated, anon;

-- ── Replace the recursive policies with helper-based USING clauses ────

-- projects."architect-member can select projects"
drop policy if exists "architect-member can select projects" on public.projects;
create policy "architect-member can select projects"
  on public.projects for select
  using ( public.is_accepted_architect(id) );

-- project_members."members read own membership"
drop policy if exists "members read own membership" on public.project_members;
create policy "members read own membership"
  on public.project_members for select
  using (
    user_id = auth.uid()
    or public.is_project_owner(project_id)
    or logs.is_admin()
  );

-- ───────────────────────────────────────────────────────────────────────
-- DASHBOARD STEPS (post-apply):
--   1. Apply this migration via the SQL Editor.
--   2. Verify the recursion is broken — as anon, via REST:
--        curl "$URL/rest/v1/projects?select=id&limit=3" -H "apikey: $ANON"
--      Expected: [] (empty array; no 42P17).
--   3. As an authenticated owner (signed-in browser session):
--        select count(*) from public.projects;
--      Expected: > 0 (the existing rows).
--   4. Refresh planning-matrix.vercel.app/dashboard — projects reappear.
-- ───────────────────────────────────────────────────────────────────────
