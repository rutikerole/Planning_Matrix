-- ───────────────────────────────────────────────────────────────────────
-- 0035_realtime_projects.sql
--
-- C8 (Bug 32) — Realtime upgrade for owner-footer reactivity.
--
-- Apply via Supabase SQL Editor only (per Bug 41 — do NOT `supabase db
-- push`). Idempotent. This is the SECONDARY path: the owner result page's
-- focus-poll fallback (window 'focus' → query invalidate) makes the
-- "Vorläufig" footer reactive WITHOUT this migration. This migration adds
-- the instant-update path.
--
-- Adds public.projects to the supabase_realtime publication so the owner
-- result page (useVerificationReactivity) can subscribe to projects UPDATE
-- — verify-fact / reject-fact mutate projects.state — and clear/revert the
-- per-item + aggregate footers live.
--
-- REPLICA IDENTITY FULL so UPDATE payloads carry the full row, not just
-- the primary key. RLS still applies to realtime: the owner only receives
-- changes to projects they can SELECT (projects owner-read policy, 0003 /
-- 0028), so no cross-tenant leak.
--
-- DASHBOARD STEPS (post-apply):
--   1. Apply this migration.
--   2. Verify membership:
--        select schemaname, tablename
--          from pg_publication_tables
--         where pubname = 'supabase_realtime' and tablename = 'projects';
--      Expected: one row (public, projects).
-- ───────────────────────────────────────────────────────────────────────

-- The publication ships by default on Supabase; create it idempotently in
-- case a fresh project lacks it.
do $$
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
end $$;

-- Full row image on UPDATE so subscribers can read changed columns.
alter table public.projects replica identity full;

-- Add projects to the publication only if it isn't already a member
-- (ALTER PUBLICATION ADD TABLE errors if the table is already present).
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'projects'
  ) then
    alter publication supabase_realtime add table public.projects;
  end if;
end $$;
