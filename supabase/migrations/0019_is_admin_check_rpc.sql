-- ───────────────────────────────────────────────────────────────────────
-- 0019_is_admin_check_rpc.sql
--
-- Phase 9.1 — public-schema wrapper for logs.is_admin().
--
-- The Phase 9 audit (commit 7b01512) found that calling
-- `logs.is_admin()` from the SPA via .schema('logs').rpc('is_admin')
-- requires the `logs` schema to be exposed via PostgREST — a step
-- that's done in the Supabase Dashboard (Settings → API → Exposed
-- schemas) and is not auto-applied by `supabase db push`. The user
-- reports the standalone console returns 404 in production, which
-- is consistent with that step not being done.
--
-- The Phase 9.1 inline drawer needs the admin gate to work without
-- the Dashboard step. A thin SECURITY DEFINER wrapper in the public
-- schema solves it: `public` is always exposed via PostgREST, so the
-- SPA can call `supabase.rpc('is_admin_check')` directly.
--
-- The wrapper is a one-line read of `logs.is_admin()` — same source
-- of truth, same allowlist (admin_users table or app.admin_emails
-- GUC), same security model.
--
-- Apply path: SQL Editor → paste → Run. Idempotent.
-- ───────────────────────────────────────────────────────────────────────

create or replace function public.is_admin_check() returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select logs.is_admin();
$$;

grant execute on function public.is_admin_check() to authenticated, anon;

-- ───────────────────────────────────────────────────────────────────────
-- Verification:
--   1. As an admin user (registered in public.admin_users):
--        select public.is_admin_check();   -- expect true
--   2. As a non-admin authed user:
--        select public.is_admin_check();   -- expect false
--   3. As anon (no JWT):
--        select public.is_admin_check();   -- expect false (auth.uid() is null)
-- ───────────────────────────────────────────────────────────────────────
