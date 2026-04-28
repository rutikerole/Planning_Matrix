-- ───────────────────────────────────────────────────────────────────────
-- 0006_share_tokens.sql
--
-- Phase 3.5 #65 — public read-only share tokens for the Result Page.
--
-- The owner generates a token from /projects/:id/result; the recipient
-- opens /result/share/:token and reads the same briefing without auth.
-- Tokens are 64-char hex (32 random bytes) with a 30-day default
-- expiry and a soft revocation column. Anon users CANNOT select rows
-- from this table directly — public access goes through the
-- get-shared-project Edge Function which uses the service role.
--
-- Apply path: Supabase Dashboard → SQL Editor → New query → paste →
-- Run. **Apply BEFORE deploying create-share-token / get-shared-project**,
-- otherwise the function INSERTs / SELECTs will fail.
--
-- Idempotent? Mostly (CREATE TABLE IF NOT EXISTS, IF NOT EXISTS on
-- the index). Re-running on a clean db is safe; re-running after a
-- partial apply is also safe.
-- ───────────────────────────────────────────────────────────────────────

create table if not exists public.project_share_tokens (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  token text not null unique,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '30 days'),
  revoked_at timestamptz
);

-- Fast active-token lookup. Partial index excludes revoked rows so
-- the get-shared-project function lookup is O(1).
create index if not exists project_share_tokens_active_idx
  on public.project_share_tokens (token)
  where revoked_at is null;

-- Project-side index for the owner-management UI ("show me all my
-- active share links").
create index if not exists project_share_tokens_project_idx
  on public.project_share_tokens (project_id, created_at desc);

alter table public.project_share_tokens enable row level security;

-- Owner can manage their own tokens (create, list, revoke). Anon
-- never selects directly — the get-shared-project Edge Function
-- runs with the service role.
create policy "owner_can_manage_own_tokens" on public.project_share_tokens
  for all
  using (created_by = auth.uid())
  with check (created_by = auth.uid());
