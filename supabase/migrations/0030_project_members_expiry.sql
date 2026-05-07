-- ───────────────────────────────────────────────────────────────────────
-- 0030_project_members_expiry.sql
--
-- v1.0.1 hot-fix — close POST_V1_AUDIT.md CRIT-3 (invite_token has no
-- TTL). Adds `expires_at` to project_members with a 7-day default;
-- existing rows are backfilled from `invited_at + 7 days` so the
-- invariant ("every row has a non-null expires_at") holds across
-- pre-migration and post-migration data.
--
-- Enforcement is in code (share-project Edge Function rejects expired
-- tokens), not in a CHECK constraint or a trigger. Two reasons:
--
--   1. A NOT NULL CHECK couldn't apply retroactively without a
--      schema-mutation lock; backfill + default is cleaner.
--   2. Postgres CHECK is row-local; a "reject expired" trigger would
--      surface as a generic insert/update failure, not a structured
--      403 with the locked architect-invite copy.
--
-- A partial index on expires_at (where accepted_at is null) speeds up
-- the eventual stale-invite cleanup query OPS_RUNBOOK § 6 documents.
--
-- Apply path: Supabase Dashboard → SQL Editor → New query → Run.
-- Idempotent: ADD COLUMN IF NOT EXISTS + COALESCE-aware UPDATE.
-- ───────────────────────────────────────────────────────────────────────

alter table public.project_members
  add column if not exists expires_at timestamptz
  default now() + interval '7 days';

-- Backfill any pre-existing row that landed before this migration with
-- a NULL expires_at. invited_at is non-null (default now() in 0026),
-- so this gives every row a deterministic 7-day expiry from its
-- creation moment.
update public.project_members
   set expires_at = invited_at + interval '7 days'
 where expires_at is null;

-- Partial index — only unclaimed (and therefore claimable) rows need
-- to be scanned during the stale-invite reaper sweep.
create index if not exists project_members_expires_at_idx
  on public.project_members (expires_at)
  where accepted_at is null;

-- ───────────────────────────────────────────────────────────────────────
-- DASHBOARD STEPS (post-apply):
--   1. Apply this migration.
--   2. Verify backfill:
--        select id, invited_at, expires_at, accepted_at
--          from public.project_members
--         where expires_at is null;
--      Expected: zero rows.
--   3. Verify default:
--        insert into public.project_members (project_id, role_in_project)
--        values ('<your-project-uuid>', 'designer')
--        returning expires_at;
--      Expected: ~7 days from now.
-- ───────────────────────────────────────────────────────────────────────
