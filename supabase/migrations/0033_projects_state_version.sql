-- ───────────────────────────────────────────────────────────────────────
-- 0033_projects_state_version.sql
--
-- v1.0.6 Phase A — close POST_V1_AUDIT.md CRITICAL-1 (verify-fact race).
--
-- Adds a project-level optimistic-locking column + a BEFORE-UPDATE
-- trigger that increments it whenever `state` is mutated. The
-- verify-fact Edge Function now writes with
-- `WHERE id = $id AND state_version = $expected`; rowcount = 0 →
-- 409 conflict → SPA refetches + shows the locked DE+EN toast.
--
-- Why project-level (Path X) vs per-item-in-JSONB (Path Y): the
-- qualifier-bearing entries (facts / recommendations / procedures /
-- documents / roles) are NESTED in projects.state JSONB — there are
-- no per-entity SQL tables to attach a per-row version to. Path Y
-- (qualifier.version inside the JSONB) was rejected for v1 as
-- overengineering at single-Bauherr-per-project scale; documented in
-- POST_V1_AUDIT.md v1.1 backlog as "upgrade if conflict rate >0.1%."
--
-- Trigger covers ALL three independent mutation paths (audit-confirmed):
--   1. commit_chat_turn_atomic RPC (migration 0013:159).
--   2. verify-fact Edge Function direct UPDATE.
--   3. SuggestionCard.tsx direct UPDATE from the SPA (Add-to-checklist).
-- The trigger fires on any UPDATE that changes `state`; no caller can
-- silently bypass it.
--
-- Apply path: Supabase Dashboard → SQL Editor → New query → Run.
-- Idempotent: ADD COLUMN IF NOT EXISTS + CREATE OR REPLACE FUNCTION +
-- DROP/CREATE TRIGGER. Safe to re-run.
-- ───────────────────────────────────────────────────────────────────────

alter table public.projects
  add column if not exists state_version bigint not null default 0;

-- Backfill: rows that existed before this migration get state_version=0
-- by the DEFAULT. No data migration needed; the optimistic lock is
-- forward-only — first verify-fact call against a row at version 0
-- behaves identically to one against version N. The version is only
-- meaningful for the racing-second-write case.

-- ── Trigger function — increment on any UPDATE that mutates `state`.
-- Set search_path = '' per Supabase 2026 hardening; mirrors
-- migration 0001's handle_new_user pattern.
create or replace function public.bump_projects_state_version()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Only increment when `state` actually changes — UPDATEs that touch
  -- only `name` / `template_id` / `bundesland` / etc. don't move the
  -- version. Use IS DISTINCT FROM so NULL → not-NULL counts.
  if new.state is distinct from old.state then
    new.state_version := old.state_version + 1;
  end if;
  return new;
end;
$$;

drop trigger if exists projects_bump_state_version on public.projects;
create trigger projects_bump_state_version
  before update on public.projects
  for each row
  execute function public.bump_projects_state_version();

-- ───────────────────────────────────────────────────────────────────────
-- DASHBOARD STEPS (post-apply):
--   1. Apply this migration via the SQL Editor.
--   2. Verify column + trigger:
--        select column_name from information_schema.columns
--          where table_schema='public' and table_name='projects'
--            and column_name='state_version';
--      Expected: one row.
--        select tgname from pg_trigger
--          where tgrelid = 'public.projects'::regclass
--            and tgname='projects_bump_state_version';
--      Expected: one row.
--   3. Verify increment fires:
--        select id, state_version from public.projects limit 3;
--        update public.projects set state = jsonb_set(state, '{__probe}', '1')
--          where id = '<any-id>';
--        select id, state_version from public.projects where id = '<any-id>';
--      Expected: state_version increased by 1.
--      Then: undo the probe with another UPDATE that strips the key.
-- ───────────────────────────────────────────────────────────────────────
