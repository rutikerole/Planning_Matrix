-- ───────────────────────────────────────────────────────────────────────
-- supabase/migrations/_smoke_tests/rls_second_account.sql
--
-- NOT a migration. The `_smoke_tests/` directory is excluded from the
-- Supabase migrations runner (the underscore prefix keeps it out of the
-- alphabetical apply order). This file documents the second-account RLS
-- smoke test that every fresh Supabase project SHOULD pass before being
-- promoted to production.
--
-- The Phase 3 RLS posture (migration 0003_planning_matrix_core.sql) is:
--   • projects — owner-scoped (auth.uid() = owner_id) on every CRUD verb
--   • messages — sub-select scope on project ownership; INSERT + SELECT
--                policies only (append-only by absence of UPDATE/DELETE)
--   • project_events — same pattern as messages
--
-- This test verifies the policies actually hold by simulating a hostile
-- second user. Run as a smoke test BEFORE the first prod deploy and
-- AGAIN any time RLS policies are touched.
--
-- HOW TO RUN
-- ──────────
-- 1. In a fresh terminal, set up two test users via the Auth dashboard:
--      User A: rls-test-a@example.invalid     (note: prefer .invalid TLD
--      User B: rls-test-b@example.invalid      so smoke users never collide
--                                              with real signups)
-- 2. Sign in as User A in the running SPA, complete the wizard, take note
--    of the resulting projects.id (visible in the URL: /projects/<UUID>).
-- 3. Open the Supabase SQL Editor and run the queries below, replacing
--    the placeholder UUIDs with the real ones from step 2.
-- 4. Each query has an EXPECTED RESULT comment. Any deviation is a fail
--    that MUST block the deploy.
--
-- All queries use `auth.jwt()` impersonation via `set_config()` so we
-- exercise the same RLS code-path the application does. The
-- `request.jwt.claims` config is what RLS reads via auth.uid().
-- ───────────────────────────────────────────────────────────────────────


-- ─── Setup helpers ────────────────────────────────────────────────────
-- Replace these UUIDs with the actual user.id and project.id values from
-- your dashboard before running the assertions below.

\set USER_A_ID 'PASTE-USER-A-UUID-HERE'
\set USER_B_ID 'PASTE-USER-B-UUID-HERE'
\set PROJECT_A_ID 'PASTE-PROJECT-A-UUID-HERE'


-- ─── Assertion 1 — User B cannot SELECT User A's project ──────────────
-- Sets the JWT context to user B, then attempts to read user A's project.
-- EXPECTED: zero rows. RLS hides the row at the policy level — no error,
-- no leak of "this row exists but you can't see it" via row count > 0.

select set_config('request.jwt.claims', json_build_object('sub', :'USER_B_ID', 'role', 'authenticated')::text, true);
select id, owner_id, name from public.projects where id = :'PROJECT_A_ID';
-- EXPECTED: 0 rows.


-- ─── Assertion 2 — User B cannot SELECT User A's messages ─────────────
select set_config('request.jwt.claims', json_build_object('sub', :'USER_B_ID', 'role', 'authenticated')::text, true);
select id, role, content_de from public.messages where project_id = :'PROJECT_A_ID';
-- EXPECTED: 0 rows.


-- ─── Assertion 3 — User B cannot SELECT User A's project_events ──────
select set_config('request.jwt.claims', json_build_object('sub', :'USER_B_ID', 'role', 'authenticated')::text, true);
select id, event_type, triggered_by from public.project_events where project_id = :'PROJECT_A_ID';
-- EXPECTED: 0 rows.


-- ─── Assertion 4 — User B cannot UPDATE User A's project ─────────────
-- The UPDATE policy on projects requires auth.uid() = owner_id, so this
-- update should affect 0 rows. No error is raised by RLS — Postgres
-- silently filters the affected row set.
select set_config('request.jwt.claims', json_build_object('sub', :'USER_B_ID', 'role', 'authenticated')::text, true);
update public.projects set name = 'rls-pwn' where id = :'PROJECT_A_ID';
-- EXPECTED: "UPDATE 0".


-- ─── Assertion 5 — User B cannot DELETE User A's project ─────────────
select set_config('request.jwt.claims', json_build_object('sub', :'USER_B_ID', 'role', 'authenticated')::text, true);
delete from public.projects where id = :'PROJECT_A_ID';
-- EXPECTED: "DELETE 0".


-- ─── Assertion 6 — User B cannot INSERT a message into User A's project ──
-- The messages INSERT policy uses an EXISTS subquery on projects.owner_id.
-- For User B, that subquery returns no rows, so the INSERT is rejected
-- with a policy violation error (not silently dropped).
select set_config('request.jwt.claims', json_build_object('sub', :'USER_B_ID', 'role', 'authenticated')::text, true);
insert into public.messages (project_id, role, content_de) values (:'PROJECT_A_ID', 'user', 'rls-pwn');
-- EXPECTED: ERROR: new row violates row-level security policy for table "messages"


-- ─── Assertion 7 — User B cannot INSERT a project_event into A's project ──
select set_config('request.jwt.claims', json_build_object('sub', :'USER_B_ID', 'role', 'authenticated')::text, true);
insert into public.project_events (project_id, event_type, triggered_by) values (:'PROJECT_A_ID', 'pwn_attempt', 'user');
-- EXPECTED: ERROR: new row violates row-level security policy for table "project_events"


-- ─── Assertion 8 — Append-only: User A cannot UPDATE their own messages ──
-- Even the owner of the project cannot mutate persisted messages or
-- project_events: the schema deliberately omits UPDATE / DELETE policies,
-- so RLS denies these by default. This protects the audit trail.
select set_config('request.jwt.claims', json_build_object('sub', :'USER_A_ID', 'role', 'authenticated')::text, true);
update public.messages set content_de = 'tampered' where project_id = :'PROJECT_A_ID';
-- EXPECTED: "UPDATE 0" (RLS silently filters; no UPDATE policy means no rows match).

select set_config('request.jwt.claims', json_build_object('sub', :'USER_A_ID', 'role', 'authenticated')::text, true);
delete from public.messages where project_id = :'PROJECT_A_ID';
-- EXPECTED: "DELETE 0".


-- ─── Cleanup ──────────────────────────────────────────────────────────
-- Reset the JWT context so subsequent SQL Editor sessions don't inherit
-- the impersonated identity.
select set_config('request.jwt.claims', null, true);


-- ───────────────────────────────────────────────────────────────────────
-- PASS / FAIL CRITERIA
--
-- A pass requires:
--   • Assertions 1–3 each return 0 rows (no leak of A's data to B).
--   • Assertions 4–5 each affect 0 rows (no mutation of A's data by B).
--   • Assertions 6–7 each raise the RLS policy-violation error.
--   • Assertion 8 affects 0 rows (audit append-only holds for A too).
--
-- A single deviation blocks the deploy. RLS is the only enforcement
-- boundary in this project — service_role is intentionally never used
-- by the Edge Function or the SPA — so a failed assertion here means
-- a real privacy regression in production.
-- ───────────────────────────────────────────────────────────────────────
