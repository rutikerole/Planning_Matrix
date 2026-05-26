-- ───────────────────────────────────────────────────────────────────────
-- 0036_project_members_architect_identity.sql
--
-- v1.0.32 Bug 112 — capture the verifying architect's SELF-ATTESTED identity
-- so the exported PDF can NAME them in the signature block instead of the
-- generic "eine/n bauvorlageberechtigte/n Architekt/in". Three nullable text
-- columns on project_members.
--
-- Additive only. Legacy memberships (and every unclaimed invite row) stay
-- NULL — no backfill, no behaviour change until an architect supplies their
-- name on first verify: VerificationPanel's one-time prompt → verify-fact
-- writes these columns AND denormalizes a snapshot into
-- projects.state.verification (read by the rollup + the PDF export).
--
-- HONESTY BOUNDARY: the name + chamber number are SELF-ATTESTED by the
-- verifying architect, NOT independently audited against the Architektenliste.
-- The PDF frames them as the verifying architect's attestation; the chamber
-- registration number is separately verifiable by the reader (e.g. a Bauamt).
-- No claim of a chamber audit we did not perform.
--
-- Apply path: Supabase Dashboard → SQL Editor → New query → paste → Run.
-- Idempotent: ADD COLUMN IF NOT EXISTS. No destructive change, no index, no
-- RLS change (the project owner already reads project_members via 0026/0031;
-- verify-fact writes via the service-role client).
-- ───────────────────────────────────────────────────────────────────────

alter table public.project_members
  add column if not exists architect_name          text,
  add column if not exists architect_chamber_no    text,
  add column if not exists architect_chamber_state text;

-- ───────────────────────────────────────────────────────────────────────
-- DASHBOARD STEPS (post-apply):
--   1. Apply this migration (SQL Editor).
--   2. Verify the columns exist:
--        select column_name from information_schema.columns
--        where table_schema = 'public' and table_name = 'project_members'
--          and column_name like 'architect_%';
--      -> architect_name, architect_chamber_no, architect_chamber_state
--   3. Redeploy the verify-fact Edge Function — v1.0.32 writes these columns
--      + projects.state.verification on the first verify that carries an
--      identity payload.
-- ───────────────────────────────────────────────────────────────────────
